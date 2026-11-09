# ==============================================================================
# UNIKART Ecosystem — Local Development Multi-App Launcher
# 2 Maintained Applications & 1 Shared FastAPI Backend
# ==============================================================================

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "   Starting UNIKART Ecosystem (FastAPI + 2 Applications)" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan

$RootPath = if ($PSScriptRoot) { $PSScriptRoot } else { "C:\Users\Fejoe\OneDrive\Desktop\Unikart" }
Set-Location -Path $RootPath

function Check-Port($port) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $iar = $tcp.BeginConnect("127.0.0.1", $port, $null, $null)
        $success = $iar.AsyncWaitHandle.WaitOne(400, $false)
        if ($success -and $tcp.Connected) {
            $tcp.EndConnect($iar)
            $tcp.Close()
            return $true
        }
        $tcp.Close()
        return $false
    } catch {
        return $false
    }
}

# 1. Start FastAPI Backend (Port 8000)
if (-not (Check-Port 8000)) {
    Write-Host "[1/3] Launching Central FastAPI Backend on http://localhost:8000..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RootPath\backend'; & '$RootPath\backend\.venv\Scripts\python.exe' -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
    Start-Sleep -Seconds 2
} else {
    Write-Host "[1/3] FastAPI Backend is already running on http://localhost:8000" -ForegroundColor Green
}

# 2. Start Customer Storefront (Port 5173)
if (-not (Check-Port 5173)) {
    Write-Host "[2/3] Launching Customer Storefront on http://localhost:5173..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RootPath\apps\storefront'; npm run dev"
} else {
    Write-Host "[2/3] Storefront already active on http://localhost:5173" -ForegroundColor Green
}

# 3. Start Inventory & Business Management (Port 5177)
if (-not (Check-Port 5177)) {
    Write-Host "[3/3] Launching Inventory & Business Management on http://localhost:5177..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RootPath\apps\inventory'; npm run dev"
} else {
    Write-Host "[3/3] Inventory & Business Management already active on http://localhost:5177" -ForegroundColor Green
}

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " Waiting for dev servers to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host " UNIKART Services Active:" -ForegroundColor Green
Write-Host " - FastAPI Backend & OpenAPI:          http://localhost:8000/docs" -ForegroundColor White
Write-Host " - 01. Customer E-Commerce Storefront: http://localhost:5173" -ForegroundColor White
Write-Host " - 02. Inventory & Business Console:   http://localhost:5177/login" -ForegroundColor White
Write-Host "       * Admin Login:           admin@unikart.in     / Admin@123" -ForegroundColor Gray
Write-Host "       * Inventory Staff Login: inventory@unikart.in / Inventory@123" -ForegroundColor Gray
Write-Host "=================================================================" -ForegroundColor Cyan
