const express = require('express');
// Cria uma instância do roteador do Express para definir rotas modularizadas
const router = express.Router();

const authController = require('../controllers/authController');
// Importa o controller que contém as funções responsáveis pelas ações de autenticação e perfil

// --- Rotas públicas ---
// Rota para registro de usuário (cria novo usuário)
router.post('/register', authController.register);

// Rota para login: antes do login, executa middleware que limpa o campo senha (ex: trim)
router.post('/login', authController.cleanPassword, authController.login);

// Rota para recuperação de senha (envia email com senha ou link)
router.post('/recuperar-senha', authController.recuperarSenha);

// --- Middleware de autenticação ---
// Todas as rotas declaradas depois desse middleware só podem ser acessadas com token válido
router.use(authController.authenticate);

// --- Rotas protegidas ---
// Rota para obter dados do perfil do usuário autenticado
router.get('/profile', authController.getProfile);

// Rota para atualizar dados do perfil do usuário autenticado
router.put('/profile', authController.updateProfile);

// Exporta o router para ser usado no app principal (app.js ou server.js)
module.exports = router;
