# Script para iniciar MySQL manualmente
Write-Host "Verificando Docker..." -ForegroundColor Yellow

# Tentar iniciar MySQL
Write-Host "Iniciando MySQL container..." -ForegroundColor Cyan
docker-compose up -d mysql

Start-Sleep -Seconds 3

Write-Host "Verificando status do container..." -ForegroundColor Yellow
docker ps --filter "name=alitar-financial-mysql"

Write-Host "`nAguardando MySQL ficar pronto..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0
$ready = $false

while ($attempt -lt $maxAttempts -and -not $ready) {
    try {
        $result = docker exec alitar-financial-mysql mysqladmin ping -h localhost -u root -prootpassword --silent 2>&1
        if ($LASTEXITCODE -eq 0) {
            $ready = $true
            Write-Host "✅ MySQL está pronto!" -ForegroundColor Green
        }
    } catch {
        # Continue
    }
    
    if (-not $ready) {
        Write-Host "." -NoNewline
        Start-Sleep -Seconds 2
        $attempt++
    }
}

if (-not $ready) {
    Write-Host "`n❌ MySQL não ficou pronto a tempo" -ForegroundColor Red
    Write-Host "Verifique os logs com: docker-compose logs mysql" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n✅ MySQL está rodando e pronto para uso!" -ForegroundColor Green
