require('dotenv').config();

module.exports = {
  dialect: 'mysql',
  
  // Configurações para Railway (usando a URL pública ou interna)
  host: process.env.MYSQLHOST || 'yamanote.proxy.rlwy.net',
  
  // Usuário do Railway
  username: process.env.MYSQLUSER || 'root',
  
  // Senha do Railway
  password: process.env.MYSQLPASSWORD || 'jdwNKqSbeysFvxrxxGIFjyOUzpjdkwRB',
  
  // Nome do banco no Railway
  database: process.env.MYSQLDATABASE || 'railway',
  
  // Porta do Railway (pública ou interna)
  port: process.env.MYSQLPORT || 39878,
  
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
    max: 10,                   // Aumentado para Railway
    min: 2,                    // Conexões mínimas mantidas
    acquire: 60000,            // Tempo aumentado para ambientes cloud
    idle: 30000                // Tempo ocioso reduzido
  },
  
  // Configuração de SSL (recomendado para conexão externa)
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false // Para desenvolvimento, em produção use certificado válido
    }
  },
  
  // Logging apenas em desenvolvimento
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  
  // Timezone configurado para UTC
  timezone: '-03:00' // Ajuste para seu fuso horário (ex: Brasil UTC-3)
};