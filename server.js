require('dotenv').config({ path: '.env' });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const db = require('./models');
const authRoutes = require('./routes/authRoutes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração avançada do transporte de email
const mailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: process.env.NODE_ENV !== 'production' // Aceita certs inválidos apenas em dev
  },
  pool: true, // Habilita conexões persistentes
  maxConnections: 5, // Pool de conexões SMTP
  maxMessages: 100 // Máximo de emails por conexão
});

app.set('mailer', mailTransporter);

// Configurações de segurança
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"]
    }
  },
  hsts: {
    maxAge: 63072000, // 2 anos em segundos
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configurado para produção/desenvolvimento
const corsWhitelist = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL]
  : [
      'http://localhost:5500',
      'http://127.0.0.1:5500',
      'http://localhost:3000',
      process.env.FRONTEND_URL
    ].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || corsWhitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: parseInt(process.env.CORS_MAX_AGE) || 86400
}));

// Rate limiting aprimorado
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX || 100,
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', apiLimiter);

// Middlewares de parsing com tratamento de erros
app.use(express.json({
  limit: process.env.REQUEST_SIZE_LIMIT || '10kb',
  verify: (req, res, buf, encoding) => {
    try {
      JSON.parse(buf.toString(encoding));
    } catch (e) {
      throw new Error('Invalid JSON');
    }
  }
}));

app.use(express.urlencoded({
  extended: true,
  limit: process.env.REQUEST_SIZE_LIMIT || '10kb'
}));

// Rotas
app.use('/api/auth', authRoutes);

// Health check endpoint com verificação de banco
app.get('/api/health', async (req, res) => {
  try {
    await db.sequelize.authenticate();
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Database connection failed',
      details: error.message
    });
  }
});

// Rota de teste de email com tratamento aprimorado
app.get('/api/test-email', async (req, res, next) => {
  try {
    const info = await mailTransporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: 'test@example.com',
      subject: 'Test Email from EcoDescarte',
      text: 'This is a test email from your EcoDescarte API',
      html: '<h1>Test Email</h1><p>This is a test email from your EcoDescarte API</p>'
    });

    res.json({
      success: true,
      message: 'Test email sent successfully',
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info)
    });
  } catch (error) {
    next(error);
  }
});

// Tratamento de rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    requestedUrl: req.originalUrl,
    method: req.method,
    availableEndpoints: {
      auth: '/api/auth',
      health: '/api/health',
      testEmail: '/api/test-email'
    }
  });
});

// Middleware de erro global
app.use(errorHandler);

// Inicialização otimizada do servidor
const startServer = async () => {
  try {
    // Configuração do Sequelize para produção
    const sequelizeOptions = {
      logging: process.env.DB_LOGGING === 'true' ? console.log : false,
      pool: {
        max: parseInt(process.env.DB_POOL_MAX) || 5,
        min: parseInt(process.env.DB_POOL_MIN) || 0,
        acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000,
        idle: parseInt(process.env.DB_POOL_IDLE) || 10000
      },
      retry: {
        max: 5, // Tentativas de reconexão
        timeout: 60000 // Tempo entre tentativas
      }
    };

    await db.sequelize.authenticate();
    console.log('✅ Database connection established');

    // Sincronização segura para produção
    const syncOptions = process.env.NODE_ENV === 'production'
      ? { alter: false, force: false }
      : { alter: true };

    await db.sequelize.sync(syncOptions);
    console.log('🔄 Database models synchronized');

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 Server running on port ${PORT}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📧 SMTP configured: ${process.env.SMTP_HOST ? 'Yes' : 'No'}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        db.sequelize.close().then(() => {
          console.log('Database connection closed');
          process.exit(0);
        });
      });
    });

    process.on('unhandledRejection', (err) => {
      console.error('Unhandled rejection:', err);
      server.close(() => process.exit(1));
    });

  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};

startServer();