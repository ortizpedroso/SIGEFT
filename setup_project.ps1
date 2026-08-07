# =============================================================================
# setup_project.ps1 — Métrica TJRR — Scaffolding de Ambiente
# Uso: Execute no PowerShell a partir do diretório raiz do projeto.
# =============================================================================

Write-Host "=== Métrica TJRR — Setup de Ambiente ===" -ForegroundColor Cyan

# ---------------------------------------------------------------------------
# 1. Verificar pré-requisitos
# ---------------------------------------------------------------------------
$dockerOk = $null
try { $dockerOk = docker --version 2>&1 } catch {}
if (-not $dockerOk) {
    Write-Error "Docker não encontrado. Instale o Docker Desktop e tente novamente."
    exit 1
}
Write-Host "[OK] Docker encontrado: $dockerOk" -ForegroundColor Green

# ---------------------------------------------------------------------------
# 2. Criar arquivo .env se não existir
# ---------------------------------------------------------------------------
if (-not (Test-Path ".\.env")) {
    Copy-Item ".\.env.example" ".\.env"
    Write-Host "[OK] Arquivo .env criado a partir de .env.example" -ForegroundColor Green
} else {
    Write-Host "[SKIP] .env já existe — não sobrescrito." -ForegroundColor Yellow
}

# ---------------------------------------------------------------------------
# 3. Criar diretórios obrigatórios caso não existam
# ---------------------------------------------------------------------------
$dirs = @(
    "specs",
    "backend\app\core",
    "backend\app\routers",
    "backend\alembic\versions",
    "frontend\src\app",
    "frontend\src\components"
)
foreach ($dir in $dirs) {
    New-Item -ItemType Directory -Force -Path ".\$dir" | Out-Null
}
Write-Host "[OK] Estrutura de diretórios verificada/criada." -ForegroundColor Green

# ---------------------------------------------------------------------------
# 4. Subir a stack com Docker Compose
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "Iniciando containers (docker compose up --build)..." -ForegroundColor Cyan
docker compose up --build -d

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== Stack iniciada com sucesso! ===" -ForegroundColor Green
    Write-Host "  Front-end : http://localhost:3001" -ForegroundColor White
    Write-Host "  Back-end  : http://localhost:8001" -ForegroundColor White
    Write-Host "  API Docs  : http://localhost:8001/docs" -ForegroundColor White
} else {
    Write-Error "Erro ao subir os containers. Verifique os logs com: docker compose logs"
}
