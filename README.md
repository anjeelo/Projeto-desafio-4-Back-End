# EcoDescarte - Backend API

API para o sistema de gerenciamento de descarte sustentável

## 📋 Pré-requisitos
- Node.js 16+
- MySQL 8+ (ou acesso ao banco no Railway)
- Git

## 🚀 Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/projeto-desafio-4-back-end.git
cd projeto-desafio-4-back-end
```

2. Instale as dependências:
```bash
npm install
```

3. Configure o ambiente:
```bash
cp .env.example .env
# Edite o .env com suas credenciais
```

4. Execute as migrações:
```bash
npx sequelize-cli db:migrate
```

5. Inicie o servidor:
```bash
npm run dev  # Para desenvolvimento
# ou
npm start    # Para produção
```

## 🌐 Variáveis de Ambiente

Crie um arquivo `.env` baseado no `.env.example`:

```
DB_HOST=seu-host-mysql
DB_PORT=3306
DB_NAME=ecodescarte
DB_USER=root
DB_PASSWORD=sua-senha
JWT_SECRET=sua-chave-secreta
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-app
FRONTEND_URL=http://localhost:3000
```

## 🛠️ Comandos Úteis

| Comando               | Descrição                          |
|-----------------------|------------------------------------|
| `npm start`           | Inicia o servidor em produção      |
| `npm run dev`         | Inicia com nodemon (desenvolvimento)|
| `npm run migrate`     | Executa migrações do banco         |
| `npm run seed`        | Popula o banco com dados iniciais  |

## 🔗 Links Importantes

- [Frontend no Vercel](https://seu-front.vercel.app)
- [Banco de Dados no Railway](https://railway.app)
- [API no Render](https://dashboard.render.com)