// Importação de módulos necessários
const nodemailer = require('nodemailer'); // Para envio de emails
const jwt = require('jsonwebtoken'); // Para geração e verificação de tokens JWT
const db = require('../models'); // Modelos do banco de dados

// Configuração do transporter de email usando nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST, // Servidor SMTP
  port: process.env.EMAIL_PORT, // Porta do servidor
  secure: process.env.EMAIL_SECURE === 'true', // Conexão segura (SSL/TLS)
  auth: {
    user: process.env.EMAIL_USER, // Usuário do email
    pass: process.env.EMAIL_PASS // Senha do email
  }
});

// Middleware para limpeza de senha antes do processamento
const cleanPassword = (req, res, next) => {
  if (req.body.senha) {
    // Remove espaços em branco da senha
    req.body.senha = req.body.senha.toString().trim();
  }
  next(); // Passa para o próximo middleware/controller
};

// Controlador para recuperação de senha
exports.recuperarSenha = async (req, res, next) => {
  try {
    const { email } = req.body;

    // 1. Verifica se o usuário existe no banco de dados
    const user = await db.User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'E-mail não encontrado em nosso sistema' 
      });
    }

    // 2. Configura e envia email com a senha atual
    const mailOptions = {
      from: `"Suporte do Sistema" <${process.env.EMAIL_FROM}>`, // Remetente
      to: email, // Destinatário
      subject: 'Recuperação de Senha', // Assunto
      html: ` // Corpo do email em HTML
        <h2>Recuperação de Senha</h2>
        <p>Você solicitou a recuperação de senha. Aqui está sua senha atual:</p>
        <p><strong>Senha: ${user.senha}</strong></p>
        <p>Recomendamos que você altere esta senha após o acesso.</p>
        <p>Caso não tenha solicitado esta recuperação, por favor ignore este email.</p>
      `
    };

    await transporter.sendMail(mailOptions); // Envia o email

    res.status(200).json({ 
      success: true,
      message: 'Senha enviada para o e-mail cadastrado' 
    });

  } catch (error) {
    console.error('Erro ao recuperar senha:', error);
    next(error); // Passa o erro para o middleware de tratamento de erros
  }
};

// Middleware de autenticação via JWT
exports.authenticate = async (req, res, next) => {
  // Extrai o token do cabeçalho Authorization
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  console.log('[AUTH] Token recebido:', token ? 'presente' : 'ausente');
  
  // Verifica se o token existe
  if (!token) {
    console.log('[AUTH] Erro: Token não fornecido');
    return res.status(401).json({ 
      success: false,
      error: 'Acesso não autorizado. Faça login para continuar.' 
    });
  }

  try {
    // Verifica e decodifica o token usando a chave secreta
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verifica se o token está perto de expirar (30 minutos)
    const now = Date.now() / 1000;
    if (decoded.exp - now < 1800) {
      console.log('[AUTH] Token perto de expirar para usuário ID:', decoded.id);
    }
    
    // Adiciona o ID do usuário à requisição e continua
    console.log('[AUTH] Token válido para usuário ID:', decoded.id);
    req.userId = decoded.id;
    next();
  } catch (error) {
    console.error('[AUTH] Token inválido:', error.message);
    
    // Mensagens de erro personalizadas
    const errorMessage = error.name === 'TokenExpiredError' 
      ? 'Sessão expirada. Faça login novamente.' 
      : 'Token inválido. Autentique-se novamente.';
    
    res.status(401).json({ 
      success: false,
      error: errorMessage 
    });
  }
};

// Controlador para registro de novos usuários
exports.register = async (req, res) => {
  console.log('[REGISTER] Iniciando registro para:', req.body.email);
  // Inicia uma transação para garantir atomicidade
  const transaction = await db.sequelize.transaction();
  
  try {
    // Extrai dados do corpo da requisição
    const { nome, cpf, nascimento, email, senha, cep, logradouro, numero, complemento, bairro, cidade, estado, caminhao, politicas, dicas } = req.body;

    // Validação de campos obrigatórios
    if (!nome || !email || !senha || !cpf) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios faltando: nome, email, senha e CPF são necessários'
      });
    }

    // Verifica se email ou CPF já estão cadastrados
    const existingUser = await db.User.findOne({
      where: {
        [db.Sequelize.Op.or]: [
          { email },
          { cpf }
        ]
      },
      attributes: ['id', 'email', 'cpf'],
      transaction 
    });

    if (existingUser) {
      let errorMessage = 'Email já cadastrado';
      if (existingUser.cpf === cpf) {
        errorMessage = 'CPF já cadastrado';
      }
      
      await transaction.rollback();
      return res.status(400).json({ 
        success: false,
        error: errorMessage 
      });
    }
    
    // Cria o usuário no banco de dados
    const user = await db.User.create({
      nome_completo: nome,
      cpf,
      data_nascimento: nascimento,
      email,
      senha: senha
    }, { transaction });

    // Cria endereço e preferências em paralelo
    await Promise.all([
      db.Address.create({
        usuario_id: user.id,
        cep,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        estado
      }, { transaction }),
      
      db.Preference.create({
        usuario_id: user.id,
        alerta_caminhao: Boolean(caminhao),
        politicas_ambientais: Boolean(politicas),
        dicas_descarte: Boolean(dicas)
      }, { transaction })
    ]);

    await transaction.commit(); // Confirma a transação
    
    // Gera token JWT para o novo usuário
    const token = jwt.sign(
      { 
        id: user.id,
        email: user.email,
        nome: user.nome_completo,
        iat: Math.floor(Date.now() / 1000), // issued at
        role: 'user'
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    
    // Retorna resposta de sucesso
    return res.status(201).json({
      success: true,
      message: 'Usuário registrado com sucesso',
      token,
      user: {
        id: user.id,
        nome: user.nome_completo,
        email: user.email,
        cpf: user.cpf,
        data_nascimento: user.data_nascimento
      }
    });

  } catch (error) {
    await transaction.rollback(); // Desfaz a transação em caso de erro
    console.error('[REGISTER] Erro:', error.message);
    
    // Tratamento de erros de validação
    let errorMessage = 'Erro durante o registro';
    if (error.name === 'SequelizeValidationError') {
      errorMessage = error.errors.map(err => err.message).join(', ');
    }
    
    return res.status(500).json({ 
      success: false,
      error: errorMessage 
    });
  }
};

// Controlador para login de usuários
exports.login = async (req, res) => {
  try {
    const { email, senha } = req.body;
    console.log('[LOGIN] Tentativa para:', email);

    // Validação de campos obrigatórios
    if (!email || !senha) {
      return res.status(400).json({
        success: false,
        error: 'Email e senha são obrigatórios'
      });
    }

    // Busca usuário incluindo endereço e preferências
    const user = await db.User.findOne({
      where: { email },
      include: [
        { 
          model: db.Address, 
          as: 'endereco',
          attributes: { exclude: ['usuario_id', 'createdAt', 'updatedAt'] }
        },
        { 
          model: db.Preference, 
          as: 'preferencias',
          attributes: { exclude: ['usuario_id', 'createdAt', 'updatedAt'] }
        }
      ]
    });

    // Verifica se usuário existe
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'Credenciais inválidas' 
      });
    }

    // Verifica se a senha está correta (comparação direta - ideal seria hash)
    const isMatch = user.senha === senha;

    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        error: 'Credenciais inválidas' 
      });
    }

    // Gera token JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        nome: user.nome_completo,
        iat: Math.floor(Date.now() / 1000),
        role: 'user'
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    
    // Retorna resposta de sucesso com token e dados do usuário
    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        nome: user.nome_completo,
        email: user.email,
        cpf: user.cpf,
        nascimento: user.data_nascimento,
        endereco: user.endereco,
        preferencias: user.preferencias
      }
    });

  } catch (error) {
    console.error('[LOGIN] Erro:', error.message);
    return res.status(500).json({ 
      success: false,
      error: 'Erro durante o login' 
    });
  }
};

// Controlador para obter perfil do usuário
exports.getProfile = async (req, res) => {
  try {
    // Busca usuário pelo ID incluindo endereço e preferências
    const user = await db.User.findByPk(req.userId, {
      include: [
        { 
          model: db.Address, 
          as: 'endereco',
          attributes: { exclude: ['usuario_id', 'createdAt', 'updatedAt'] }
        },
        { 
          model: db.Preference, 
          as: 'preferencias',
          attributes: { exclude: ['usuario_id', 'createdAt', 'updatedAt'] }
        }
      ],
      attributes: { 
        exclude: ['senha', 'createdAt', 'updatedAt'] // Exclui campos sensíveis
      }
    });

    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'Usuário não encontrado' 
      });
    }

    return res.status(200).json({
      success: true,
      user
    });

  } catch (error) {
    console.error('[PROFILE] Erro:', error.message);
    return res.status(500).json({ 
      success: false,
      error: 'Erro ao buscar perfil' 
    });
  }
};

// Controlador para atualizar perfil do usuário
exports.updateProfile = async (req, res) => {
  // Inicia transação
  const transaction = await db.sequelize.transaction();
  
  try {
    const { nome_completo, data_nascimento, email, endereco, preferencias } = req.body;

    // Validação de campos obrigatórios
    if (!nome_completo || !email) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Nome e email são obrigatórios'
      });
    }

    // Verifica se o novo email já está em uso
    const emailExists = await db.User.findOne({
      where: {
        email,
        id: { [db.Sequelize.Op.ne]: req.userId }
      },
      transaction
    });

    if (emailExists) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Este email já está em uso por outro usuário'
      });
    }

    // Atualiza usuário, endereço e preferências em paralelo
    await Promise.all([
      db.User.update({
        nome_completo,
        data_nascimento,
        email
      }, {
        where: { id: req.userId },
        transaction
      }),
      
      db.Address.update(endereco, {
        where: { usuario_id: req.userId },
        transaction
      }),
      
      db.Preference.update(preferencias, {
        where: { usuario_id: req.userId },
        transaction
      })
    ]);

    await transaction.commit(); // Confirma a transação
    
    return res.status(200).json({
      success: true,
      message: 'Perfil atualizado com sucesso'
    });

  } catch (error) {
    await transaction.rollback(); // Desfaz a transação em caso de erro
    console.error('[UPDATE] Erro:', error.message);
    
    // Tratamento de erros de validação
    let errorMessage = 'Erro ao atualizar perfil';
    if (error.name === 'SequelizeValidationError') {
      errorMessage = error.errors.map(err => err.message).join(', ');
    }
    
    return res.status(500).json({ 
      success: false,
      error: errorMessage 
    });
  }
};

// Exporta o middleware de limpeza de senha
exports.cleanPassword = cleanPassword;