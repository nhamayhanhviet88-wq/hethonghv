@echo off
echo ========================================
echo   KHOI DONG TAT CA SERVICES
echo   %date% %time%
echo ========================================

:: ---- DUONG DAN CHINH ----
set "PROJECT_DIR=D:\0 - Google Antigravity\11 - NHAN VIEN KINH DOANH - Copy"
set "CLOUDFLARED_EXE=D:\0 - Google Antigravity\7 - Quan Ly Page SLL\cloudflared.exe"
set "CLOUDFLARED_CONFIG=C:\Users\ADMIN\.cloudflared\config-hethonghv.yml"

:: ---- 1. KHOI DONG SERVER NODE.JS (PORT 11000) ----
echo.
echo [1/2] Dang kiem tra Node.js server...

:: Kiem tra xem port 11000 da dang chay chua
netstat -an | findstr "0.0.0.0:11000" >nul 2>&1
if %errorlevel%==0 (
    echo     [OK] Server da dang chay tren port 11000. Bo qua.
) else (
    echo     [START] Khoi dong Node.js server tu thu muc chinh...
    cd /d "%PROJECT_DIR%"
    start /min "HV-CRM-Server" cmd /c "cd /d "%PROJECT_DIR%" && node server.js"
    echo     [OK] Server dang khoi dong...
    timeout /t 5 /nobreak >nul
)

:: ---- 2. KHOI DONG CLOUDFLARE TUNNEL (hethonghv.top) ----
echo.
echo [2/2] Dang kiem tra Cloudflare Tunnel...

:: Kiem tra xem cloudflared da chay chua
tasklist /FI "IMAGENAME eq cloudflared.exe" 2>nul | findstr "cloudflared" >nul 2>&1
if %errorlevel%==0 (
    echo     [OK] Cloudflare Tunnel da dang chay. Bo qua.
) else (
    echo     [START] Khoi dong Cloudflare Tunnel cho hethonghv.top...
    start /min "HV-Cloudflare-Tunnel" "%CLOUDFLARED_EXE%" tunnel --config "%CLOUDFLARED_CONFIG%" run
    echo     [OK] Cloudflare Tunnel dang khoi dong...
    timeout /t 3 /nobreak >nul
)

:: ---- KET QUA ----
echo.
echo ========================================
echo   TAT CA SERVICES DA KHOI DONG!
echo   - Server:  http://localhost:11000
echo   - Website: https://hethonghv.top
echo   - Project: %PROJECT_DIR%
echo ========================================
echo.
timeout /t 5 /nobreak >nul
