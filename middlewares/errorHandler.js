// Middleware de tratamento de erros padrão do Express
// Recebe 4 parâmetros (err, req, res, next) para ser identificado como middleware de erro
module.exports = (err, req, res, next) => {
  // Configuração básica de logging com timestamp
  const timestamp = new Date().toISOString();
  
  // Log do erro completo (stack) ou apenas mensagem se stack não existir
  console.error(`[${timestamp}] Erro:`, err.stack || err.message);
  
  // Objeto de resposta padrão que será enviado ao cliente
  const errorResponse = {
    success: false, // Indica que a operação falhou
    timestamp,      // Marca temporal do erro
    path: req.originalUrl, // Rota acessada
    method: req.method,    // Método HTTP usado
  };

  // Estrutura switch para tratar diferentes tipos de erro
  // Usa 'true' como expressão para permitir avaliação de casos com condições
  switch (true) {
    // Erros de validação do Sequelize (validações de modelo)
    case err.name === 'SequelizeValidationError':
      errorResponse.status = 400; // Bad Request
      errorResponse.error = 'Erro de validação';
      // Mapeia os erros de validação para um formato mais amigável
      errorResponse.details = err.errors.map(e => ({
        field: e.path,     // Campo que falhou na validação
        message: e.message, // Mensagem de erro
        type: e.type,      // Tipo de validação que falhou
        value: e.value     // Valor que causou o erro
      }));
      break;
    
    // Erros de constraint única (dados duplicados)
    case err.name === 'SequelizeUniqueConstraintError':
      errorResponse.status = 409; // Conflict
      errorResponse.error = 'Conflito de dados';
      errorResponse.details = err.errors.map(e => ({
        field: e.path,
        message: `O valor '${e.value}' já existe e deve ser único`
      }));
      break;
    
    // Erros de token JWT inválido
    case err.name === 'JsonWebTokenError':
      errorResponse.status = 401; // Unauthorized
      errorResponse.error = 'Token inválido';
      errorResponse.message = 'Falha na autenticação';
      break;
    
    // Erros de token JWT expirado
    case err.name === 'TokenExpiredError':
      errorResponse.status = 401; // Unauthorized
      errorResponse.error = 'Token expirado';
      errorResponse.message = 'Sessão expirada, faça login novamente';
      break;
    
    // Erros de recurso não encontrado
    case err.name === 'SequelizeEmptyResultError':
    case err.message.includes('not found'):
      errorResponse.status = 404; // Not Found
      errorResponse.error = 'Recurso não encontrado';
      break;
    
    // Erros de autorização (acesso proibido)
    case err.status === 403:
      errorResponse.status = 403; // Forbidden
      errorResponse.error = 'Acesso não autorizado';
      break;
    
    // Erros genéricos de banco de dados
    case err.name === 'SequelizeDatabaseError':
      errorResponse.status = 500; // Internal Server Error
      errorResponse.error = 'Erro no banco de dados';
      errorResponse.message = 'Ocorreu um problema ao acessar os dados';
      break;
    
    // Erros customizados que já possuem status definido (entre 400-499)
    case !!err.status && err.status >= 400 && err.status < 500:
      errorResponse.status = err.status;
      errorResponse.error = err.message || 'Erro na requisição';
      break;
    
    // Tratamento padrão para qualquer outro erro não capturado
    default:
      errorResponse.status = 500; // Internal Server Error
      errorResponse.error = 'Erro interno no servidor';
      // Em desenvolvimento, inclui detalhes do erro
      if (process.env.NODE_ENV === 'development') {
        errorResponse.stack = err.stack;
        errorResponse.message = err.message;
      }
      break;
  }

  // Se estiver em ambiente de desenvolvimento, inclui mais detalhes do erro
  if (process.env.NODE_ENV === 'development') {
    errorResponse.debug = {
      name: err.name,     // Nome do erro
      message: err.message, // Mensagem original
      stack: err.stack    // Stack trace completo
    };
  }

  // Envia a resposta HTTP com o status apropriado e o objeto de erro formatado
  res.status(errorResponse.status || 500).json(errorResponse);
};