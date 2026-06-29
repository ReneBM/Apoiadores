# Sistema de Gestão de Apoiadores Políticos
## Senador Styveson Valim

---

## Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com) (banco PostgreSQL)

---

## 1. Configurar o Banco de Dados

1. Acesse o painel do **Supabase** → seu projeto → **SQL Editor**
2. Cole e execute o conteúdo de `database/schema.sql`
3. Gere o hash da senha admin:
   ```bash
   cd backend
   node -e "const b = require('bcrypt'); b.hash('Admin@2025', 12).then(console.log)"
   ```
4. Cole o hash gerado no INSERT do seed (última parte do schema.sql) e execute

---

## 2. Configurar o Backend

```bash
cd backend
cp .env.example .env
```

Edite o `.env` com:
- `DATABASE_URL` — connection string do Supabase (Project Settings → Database → URI)
- `JWT_SECRET` — gere com: `node -e "require('crypto').randomBytes(64).toString('hex') |> console.log"`
- `FRONTEND_URL` — URL do frontend em produção

```bash
npm install
npm run dev        # desenvolvimento (porta 3001)
npm start          # produção
```

---

## 3. Configurar o Frontend

```bash
cd frontend
cp .env.example .env
```

Edite o `.env`:
- `VITE_API_URL=http://localhost:3001/api` (dev) ou URL da VPS (produção)

```bash
npm install
npm run dev        # desenvolvimento (porta 5173)
npm run build      # gerar build de produção (pasta dist/)
```

---

## 4. Instalar como PWA (Celular)

1. Abra o sistema no navegador do celular (Chrome/Safari)
2. Chrome Android: menu ⋮ → **"Adicionar à tela inicial"**
3. Safari iOS: botão compartilhar → **"Adicionar à Tela de Início"**

---

## 5. Estrutura de Roles

| Role | Acesso |
|------|--------|
| `admin` | Tudo: dashboard, apoiadores, multiplicadores, export |
| `coordenador` | Dashboard, apoiadores de todos, multiplicadores (leitura) |
| `multiplicador` | Painel próprio, apenas seus apoiadores |

---

## 6. Deploy em VPS (Hetzner)

### Backend (PM2 + Nginx)
```bash
npm install -g pm2
pm2 start server.js --name "senador-backend"
pm2 save && pm2 startup
```

### Frontend (Nginx)
```bash
npm run build
# Copie a pasta dist/ para /var/www/senador-valim/
```

Exemplo de bloco Nginx:
```nginx
server {
    listen 80;
    server_name seu-dominio.com.br;

    # Frontend
    location / {
        root /var/www/senador-valim;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 7. Variáveis de Ambiente

### Backend (.env)
| Variável | Descrição |
|----------|-----------|
| `PORT` | Porta do servidor (padrão: 3001) |
| `DATABASE_URL` | Connection string PostgreSQL/Supabase |
| `JWT_SECRET` | Segredo JWT (64+ bytes aleatórios) |
| `JWT_ACCESS_EXPIRES_IN` | Expiração do access token (padrão: 15m) |
| `JWT_REFRESH_EXPIRES_IN` | Expiração do refresh token (padrão: 7d) |
| `FRONTEND_URL` | URL do frontend (para CORS em produção) |

### Frontend (.env)
| Variável | Descrição |
|----------|-----------|
| `VITE_API_URL` | URL base da API (ex: https://api.seudominio.com.br/api) |

---

## 8. Conformidade LGPD

- Campo `consentimento_lgpd` obrigatório no cadastro de apoiadores
- Data e hora do consentimento registradas em `data_consentimento`
- Tabela `audit_log` registra todas as operações de criação, edição e exclusão
- Senhas criptografadas com bcrypt (12 rounds)
- Refresh tokens com rotação automática e revogação no logout
