Write-Host "Starting Queue Flow Services..." -ForegroundColor Green

# 1. Start XAMPP MySQL Database (only if XAMPP is installed and mysql not running)
$mysqlRunning = Get-Process -Name "mysqld" -ErrorAction SilentlyContinue
if (-not $mysqlRunning -and (Test-Path "C:\xampp\mysql\bin\mysqld.exe")) {
    Write-Host "Starting MySQL Database..." -ForegroundColor Cyan
    Start-Process -FilePath "C:\xampp\mysql\bin\mysqld.exe" -ArgumentList "--defaults-file=C:\xampp\mysql\bin\my.ini", "--console" -WindowStyle Hidden
    Start-Sleep -Seconds 3
} elseif ($mysqlRunning) {
    Write-Host "MySQL Database is already running." -ForegroundColor Yellow
} else {
    Write-Host "Using default SQLite database (no local MySQL needed)." -ForegroundColor Yellow
}

# 2. Start Django Backend Server (runs in a new PowerShell window)
Write-Host "Starting Django Backend..." -ForegroundColor Cyan
$backendCmd = "cd backend; if (Test-Path .\venv\Scripts\Activate.ps1) { .\venv\Scripts\Activate.ps1 }; python manage.py runserver 0.0.0.0:8001"
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", $backendCmd

# 3. Start Vite Frontend Server (runs in a new PowerShell window)
Write-Host "Starting Vite Frontend..." -ForegroundColor Cyan
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "npm.cmd run dev"

Write-Host "All services launched successfully!" -ForegroundColor Green
Write-Host "  -> Frontend: http://localhost:8081 (or http://<your-lan-ip>:8081)" -ForegroundColor Green
Write-Host "  -> Backend API (Proxied through Frontend in Dev): http://localhost:8081/api/" -ForegroundColor Green
Write-Host "  -> Direct Backend Server: http://localhost:8001" -ForegroundColor Green
Write-Host "  -> phpMyAdmin: http://localhost:9090/phpmyadmin/" -ForegroundColor Green
