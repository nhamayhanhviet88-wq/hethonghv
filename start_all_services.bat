@echo off
echo ========================================
echo   KHOI DONG TAT CA SERVICES
echo   %date% %time%
echo ========================================

:: ---- LOG FILE ----
set "PROJECT_DIR=D:\0 - Google Antigravity\11 - NHAN VIEN KINH DOANH - Copy"
set "LOGFILE=%PROJECT_DIR%\logs\startup.log"
set "CLOUDFLARED_EXE=D:\0 - Google Antigravity\7 - Quản Lý Page SLL\cloudflared.exe"
set "CLOUDFLARED_CONFIG=C:\Users\ADMIN\.cloudflared\config-hethonghv.yml"

:: Tao thu muc logs neu chua co
if not exist "%PROJECT_DIR%\logs" mkdir "%PROJECT_DIR%\logs"

:: Ghi log
echo. >> "%LOGFILE%"
echo ======================================== >> "%LOGFILE%"
echo   KHOI DONG: %date% %time% >> "%LOGFILE%"
echo ======================================== >> "%LOGFILE%"

:: ---- 1. KHOI DONG SERVER NODE.JS QUA PM2 (PORT 11000) ----
echo.
echo [1/3] Dang kiem tra Node.js server (PM2)...
echo [1/3] Kiem tra Node.js server (PM2)... >> "%LOGFILE%"

:: Kiem tra xem port 11000 da dang chay chua
netstat -an | findstr "0.0.0.0:11000" >nul 2>&1
if %errorlevel%==0 (
    echo     [OK] Server da dang chay tren port 11000. Bo qua.
    echo     [OK] Server da chay tren port 11000. Bo qua. >> "%LOGFILE%"
) else (
    echo     [START] Khoi dong PM2 server...
    echo     [START] Khoi dong PM2... >> "%LOGFILE%"
    cd /d "%PROJECT_DIR%"
    
    :: Thu resurrect truoc (khoi phuc process da save)
    call pm2 resurrect >nul 2>&1
    
    :: Kiem tra lai port
    timeout /t 3 /nobreak >nul
    netstat -an | findstr "0.0.0.0:11000" >nul 2>&1
    if %errorlevel%==0 (
        echo     [OK] PM2 resurrect thanh cong!
        echo     [OK] PM2 resurrect thanh cong! >> "%LOGFILE%"
    ) else (
        :: Neu resurrect khong duoc, start tu ecosystem
        echo     [RETRY] Resurrect that bai, start tu ecosystem...
        echo     [RETRY] Start tu ecosystem... >> "%LOGFILE%"
        call pm2 start ecosystem.config.js
        timeout /t 3 /nobreak >nul
    )
    
    echo     [OK] PM2 server dang khoi dong...
    echo     [OK] PM2 server khoi dong xong. >> "%LOGFILE%"
)

:: ---- 2. SAVE PM2 PROCESS LIST ----
echo.
echo [2/3] Luu PM2 process list...
call pm2 save --force >nul 2>&1
echo     [OK] PM2 process list da luu.
echo [2/3] PM2 save done. >> "%LOGFILE%"

:: ---- 3. KHOI DONG CLOUDFLARE TUNNEL (hethonghv.top) ----
echo.
echo [3/3] Dang kiem tra Cloudflare Tunnel...
echo [3/3] Kiem tra Cloudflare Tunnel... >> "%LOGFILE%"

:: Kiem tra xem cloudflared da chay chua
tasklist /FI "IMAGENAME eq cloudflared.exe" 2>nul | findstr "cloudflared" >nul 2>&1
if %errorlevel%==0 (
    echo     [OK] Cloudflare Tunnel da dang chay. Bo qua.
    echo     [OK] Cloudflare Tunnel da chay. Bo qua. >> "%LOGFILE%"
) else (
    echo     [START] Khoi dong Cloudflare Tunnel cho hethonghv.top...
    echo     [START] Khoi dong Cloudflare Tunnel... >> "%LOGFILE%"
    start /min "HV-Cloudflare-Tunnel" "%CLOUDFLARED_EXE%" tunnel --config "%CLOUDFLARED_CONFIG%" run
    echo     [OK] Cloudflare Tunnel dang khoi dong...
    echo     [OK] Cloudflare Tunnel khoi dong xong. >> "%LOGFILE%"
    timeout /t 3 /nobreak >nul
)

:: ---- KET QUA ----
echo.
echo ========================================
echo   TAT CA SERVICES DA KHOI DONG!
echo   - Server:  http://localhost:11000
echo   - Website: https://hethonghv.top
echo   - PM2:     pm2 list
echo   - Project: %PROJECT_DIR%
echo ========================================
echo.
echo   HOAN TAT: %date% %time% >> "%LOGFILE%"
echo ======================================== >> "%LOGFILE%"
timeout /t 5 /nobreak >nul
