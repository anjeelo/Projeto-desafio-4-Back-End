require('dotenv').config();

module.exports = {
  dialect: 'mysql',
  
  // Configurações para Railway (usando a URL pública ou interna)
  host: process.env.DB_HOST || 'tramway.proxy.rlwy.net',
  
  // Usuário do Railway
  username: process.env.DB_USER || 'root',
  
  // Senha do Railway
  password: process.env.DB_PASSWORD || 'xYsGJOGymmfQeefiAvjPknfPNOOIplrn',
  
  // Nome do banco no Railway
  database: process.env.DB_NAME || 'railway',
  
  // Porta do Railway (pública ou interna)
  port: process.env.DB_PORT || 40343,
  
  // Configurações do Sequelize
  define: {
    timestamps: true,
    underscored: true,
    underscoredAll: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  
  // Pool de conexões otimizado para Railway
  pool: {
    max: parseInt(process.env.DB_POOL_MAX) || 10,
    min: parseInt(process.env.DB_POOL_MIN) || 2,
    acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 60000,
    idle: parseInt(process.env.DB_POOL_IDLE) || 30000
  },
  
  // Configuração de SSL (recomendado para conexão externa)
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false // Para desenvolvimento, em produção use certificado válido
    }
  },
  
  // Logging apenas em desenvolvimento
  logging: process.env.DB_LOGGING === 'true' ? console.log : false,
  
  // Timezone configurado para UTC
  timezone: '-03:00' // Ajuste para seu fuso horário (ex: Brasil UTC-3)
};
