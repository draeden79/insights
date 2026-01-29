# Como Iniciar a Aplicação

## Passo a Passo

### 1. Certifique-se que o Docker Desktop está rodando
- Abra o Docker Desktop
- Aguarde até aparecer "Docker is running" na barra de tarefas

### 2. Inicie o MySQL

**Opção A - Script PowerShell:**
```powershell
.\scripts\start-mysql.ps1
```

**Opção B - Manualmente:**
```bash
docker-compose up -d mysql
```

Aguarde alguns segundos até o MySQL estar pronto. Você pode verificar com:
```bash
docker ps
```

### 3. Configure o Banco de Dados (apenas na primeira vez)

Se ainda não rodou o setup, execute:
```bash
# Rodar migrations
docker exec -i alitar-financial-mysql mysql -u root -prootpassword alitar_financial < database/migrations/001_initial_schema.sql

# Seed series
npm run seed

# Snapshots iniciais
npm run snapshot -- --slug spx_price_monthly
npm run snapshot -- --slug spx_pe_monthly
```

Ou execute o setup completo:
```bash
node scripts/setup-dev.js
```

### 4. Inicie a Aplicação

```bash
npm start
```

A aplicação estará disponível em: **http://localhost:3000**

---

## Verificar se MySQL está rodando

```bash
docker ps --filter "name=alitar-financial-mysql"
```

Se aparecer algo como:
```
CONTAINER ID   IMAGE       STATUS         PORTS                    NAMES
xxxxx          mysql:8.0   Up 2 minutes   0.0.0.0:3306->3306/tcp  alitar-financial-mysql
```

Então o MySQL está rodando!

---

## Troubleshooting

### Erro: "Acesso negado" ao Docker
- Certifique-se que o Docker Desktop está totalmente iniciado
- Tente executar como Administrador
- Reinicie o Docker Desktop

### Erro: "Cannot connect to MySQL"
- Verifique se o container está rodando: `docker ps`
- Verifique os logs: `docker-compose logs mysql`
- Aguarde alguns segundos após iniciar o container

### Porta 3306 já em uso
- Pare qualquer MySQL local que esteja rodando
- Ou altere a porta no `docker-compose.yml`
