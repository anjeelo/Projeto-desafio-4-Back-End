// Importação de módulos necessários
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const db = require('../models'); // Conexão com os modelos já configurada para o Railway

/* 
  Toda a lógica original foi mantida exatamente como está
  Apenas garantindo que a conexão com o banco vai funcionar no Railway
*/

// Configuração do transporter de email (mantida original)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Middleware para limpeza de senha (mantido original)
const cleanPassword = (req, res, next) => {
  if (req.body.senha) {
    req.body.senha = req.body.senha.toString().trim();
  }
  next();
};

// Controlador para recuperação de senha (mantido original)
exports.recuperarSenha = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await db.User.findOne({ where: { email } });
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'E-mail não encontrado em nosso sistema' 
      });
    }

    const mailOptions = {
      from: `"Suporte do Sistema" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: 'Recuperação de Senha',
      html: `
        <h2>Recuperação de Senha</h2>
        <p>Você solicitou a recuperação de senha. Aqui está sua senha atual:</p>
        <p><strong>Senha: ${user.senha}</strong></p>
        <p>Recomendamos que você altere esta senha após o acesso.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ 
      success: true,
      message: 'Senha enviada para o e-mail cadastrado' 
    });

  } catch (error) {
    console.error('Erro ao recuperar senha:', error);
    next(error);
  }
};

// Middleware de autenticação (mantido original)
exports.authenticate = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ 
      success: false,
      error: 'Acesso não autorizado. Faça login para continuar.' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (error) {
    const errorMessage = error.name === 'TokenExpiredError' 
      ? 'Sessão expirada. Faça login novamente.' 
      : 'Token inválido. Autentique-se novamente.';
    
    res.status(401).json({ 
      success: false,
      error: errorMessage 
    });
  }
};

// Controlador para registro (mantido original)
exports.register = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const { nome, cpf, nascimento, email, senha, cep, logradouro, numero, complemento, bairro, cidade, estado, caminhao, politicas, dicas } = req.body;

    if (!nome || !email || !senha || !cpf) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios faltando'
      });
    }

    const existingUser = await db.User.findOne({
      where: { [db.Sequelize.Op.or]: [{ email }, { cpf }] },
      transaction 
    });

    if (existingUser) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false,
        error: existingUser.cpf === cpf ? 'CPF já cadastrado' : 'Email já cadastrado'
      });
    }
    
    const user = await db.User.create({
      nome_completo: nome,
      cpf,
      data_nascimento: nascimento,
      email,
      senha: senha
    }, { transaction });

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

    await transaction.commit();
    
    const token = jwt.sign(
      { id: user.id, email: user.email, nome: user.nome_completo },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    
    return res.status(201).json({
      success: true,
      message: 'Usuário registrado com sucesso',
      token,
      user: {
        id: user.id,
        nome: user.nome_completo,
        email: user.email
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Erro no registro:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Erro durante o registro' 
    });
  }
};

// Controlador para login (mantido original)
exports.login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({
        success: false,
        error: 'Email e senha são obrigatórios'
      });
    }

    const user = await db.User.findOne({
      where: { email },
      include: [
        { model: db.Address, as: 'endereco' },
        { model: db.Preference, as: 'preferencias' }
      ]
    });

    if (!user || user.senha !== senha) {
      return res.status(401).json({ 
        success: false,
        error: 'Credenciais inválidas' 
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, nome: user.nome_completo },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    
    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        nome: user.nome_completo,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Erro durante o login' 
    });
  }
};

// Exportações finais (mantidas originais)
exports.cleanPassword = cleanPassword;