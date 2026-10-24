# TrustVault Full-Stack Development Startup Script (PowerShell)
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "       TRUSTVAULT: Secure Document Sharing Enclave        " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "[1/3] Verifying Python backend dependencies..." -ForegroundColor Yellow

# Seed database if not populated
python backend/app/seed.py

Write-Host "[2/3] Launching FastAPI Backend on http://127.0.0.1:8000 ..." -ForegroundColor Green
$backendJob = Start-Job -ScriptBlock {
    python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
}

Write-Host "[3/3] Launching Next.js Frontend on http://localhost:3000 ..." -ForegroundColor Green
Set-Location frontend
npm run dev

# Stop backend job on exit
Stop-Job $backendJob
Remove-Job $backendJob
