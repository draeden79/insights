# Guia Rápido de Setup

## Configuração Automática (Recomendado)

### 1. Iniciar Docker Desktop
Certifique-se de que o Docker Desktop está rodando no Windows.

### 2. Executar Setup Automático

**Opção A - Script Node.js (Recomendado):**
```bash
node scripts/setup-dev.js
```

**Opção B - Script PowerShell:**
```powershell
.\scripts\setup-dev.ps1
```

**Opção C - Script Bash (se tiver Git Bash/WSL):**
```bash
chmod +x scripts/setup-dev.sh
./scripts/setup-dev.sh
```

O script irá:
- ✅ Iniciar container MySQL via Docker
- ✅ Criar banco de dados `alitar_financial`
- ✅ Rodar migrations
- ✅ Seed das séries iniciais
- ✅ Baixar dados do Shiller (snapshots)

### 3. Iniciar Aplicação
```bash
npm start
```

A aplicação estará disponível em: **http://localhost:3000**

---

## Configuração Manual

Se preferir configurar manualmente:

### 1. Iniciar MySQL
```bash
docker-compose up -d mysql
```

### 2. Aguardar MySQL estar pronto
```bash
# Verificar logs
docker-compose logs -f mysql

# Ou aguardar alguns segundos até ver "ready for connections"
```

### 3. Rodar Migrations
```bash
docker exec -i alitar-financial-mysql mysql -u root -prootpassword alitar_financial < database/migrations/001_initial_schema.sql
```

### 4. Seed Series
```bash
npm run seed
```

### 5. Snapshots Iniciais
```bash
npm run snapshot -- --slug spx_price_monthly
npm run snapshot -- --slug spx_pe_monthly
```

### 6. Iniciar Aplicação
```bash
npm start
```

---

## Credenciais MySQL (Docker)

As credenciais já estão configuradas no `.env`:

- **Host:** localhost
- **Port:** 3306
- **Database:** alitar_financial
- **User:** alitar_user
- **Password:** alitar_password
- **Root Password:** rootpassword

---

## Comandos Úteis

### Docker
```bash
# Iniciar MySQL
npm run docker:up
# ou
docker-compose up -d mysql

# Parar MySQL
npm run docker:down
# ou
docker-compose down

# Ver logs do MySQL
npm run docker:logs
# ou
docker-compose logs -f mysql

# Acessar MySQL via CLI
docker exec -it alitar-financial-mysql mysql -u root -prootpassword alitar_financial
```

### Aplicação
```bash
# Iniciar servidor
npm start

# Modo desenvolvimento (auto-reload)
npm run dev

# Atualizar dados
npm run update-all

# Reset série
npm run reset -- --slug spx_price_monthly
```

---

## Troubleshooting

### Docker não está rodando
- Abra o Docker Desktop
- Aguarde até aparecer "Docker is running"

### Erro de conexão com MySQL
- Verifique se o container está rodando: `docker ps`
- Verifique os logs: `docker-compose logs mysql`
- Aguarde alguns segundos após iniciar o container

### Erro ao baixar dados do Shiller
- Verifique sua conexão com a internet
- A URL do Shiller pode estar temporariamente indisponível
- Tente novamente mais tarde

### Porta 3306 já em uso
- Se você já tem MySQL rodando localmente, pare-o ou mude a porta no `docker-compose.yml`
