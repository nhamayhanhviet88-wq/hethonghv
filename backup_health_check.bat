@echo off
REM === KIEM TRA SUC KHOE BACKUP KHI KHOI DONG ===
REM Chay tu dong khi Windows bat len, kiem tra backup co chay dung khong
REM Neu phat hien backup bi loi -> thong bao ngay

set "PROJECT_DIR=d:\0 - Google Antigravity\11 - NHAN VIEN KINH DOANH - Copy"
set "LOCAL_DB_DIR=%PROJECT_DIR%\local_backups\database"
set "LOCAL_CODE_DIR=%PROJECT_DIR%\local_backups\code"
set "DRIVE_DB_DIR=I:\My Drive\BACKUP_HV\database"
set "LOGFILE=%PROJECT_DIR%\logs\backup_health.log"

REM Tao logs folder
if not exist "%PROJECT_DIR%\logs" mkdir "%PROJECT_DIR%\logs"

echo ======================================== >> "%LOGFILE%"
echo   BACKUP HEALTH CHECK: %date% %time% >> "%LOGFILE%"
echo ======================================== >> "%LOGFILE%"

set ERRORS=0
set WARNINGS=0

REM --- 1. Kiem tra scheduled tasks con ton tai khong ---
schtasks /query /tn "Backup_DongPhucHV_21h" >nul 2>&1
if %errorlevel% neq 0 (
    set /a ERRORS+=1
    echo [LOI] Task Backup_DongPhucHV_21h KHONG TON TAI! >> "%LOGFILE%"
) else (
    echo [OK] Task Backup_DongPhucHV_21h ton tai >> "%LOGFILE%"
)

schtasks /query /tn "LocalBackup_15min" >nul 2>&1
if %errorlevel% neq 0 (
    set /a ERRORS+=1
    echo [LOI] Task LocalBackup_15min KHONG TON TAI! >> "%LOGFILE%"
) else (
    echo [OK] Task LocalBackup_15min ton tai >> "%LOGFILE%"
)

REM --- 2. Kiem tra DB backup gan nhat (local) ---
set FOUND_RECENT_DB=0
for /f %%f in ('powershell -Command "$f = Get-ChildItem '%LOCAL_DB_DIR%' -Filter *.sql -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1; if($f){$f.LastWriteTime.ToString('yyyy-MM-dd')}else{'NONE'}"') do (
    set LAST_DB_DATE=%%f
)
if "%LAST_DB_DATE%"=="NONE" (
    set /a ERRORS+=1
    echo [LOI] Khong tim thay file DB backup nao! >> "%LOGFILE%"
) else (
    set FOUND_RECENT_DB=1
    echo [INFO] DB backup gan nhat: %LAST_DB_DATE% >> "%LOGFILE%"
    REM Kiem tra xem co qua 2 ngay khong
    for /f %%d in ('powershell -Command "((Get-Date) - (Get-Date '%LAST_DB_DATE%')).Days"') do (
        if %%d GTR 2 (
            set /a WARNINGS+=1
            echo [CANH BAO] DB backup da cu %%d ngay! >> "%LOGFILE%"
        ) else (
            echo [OK] DB backup con moi ^(%%d ngay truoc^) >> "%LOGFILE%"
        )
    )
)

REM --- 3. Kiem tra Google Drive mount ---
if exist "I:\My Drive\BACKUP_HV" (
    echo [OK] Google Drive mounted tai I:\My Drive\BACKUP_HV >> "%LOGFILE%"
) else (
    set /a WARNINGS+=1
    echo [CANH BAO] Google Drive KHONG mount! Backup cloud se khong hoat dong >> "%LOGFILE%"
)

REM --- 4. Kiem tra ket noi PostgreSQL ---
for /f %%r in ('node -e "require('dotenv').config();const{Pool:P}=require('pg');const p=new P({connectionString:process.env.DATABASE_URL,max:1,connectionTimeoutMillis:5000});p.query('SELECT 1').then(()=>{console.log('DB_OK');p.end()}).catch(()=>{console.log('DB_FAIL');p.end()})" 2^>nul') do set DB_STATUS=%%r
if "%DB_STATUS%"=="DB_OK" (
    echo [OK] Ket noi PostgreSQL thanh cong >> "%LOGFILE%"
) else (
    set /a ERRORS+=1
    echo [LOI] Khong ket noi duoc PostgreSQL! Backup se THAT BAI >> "%LOGFILE%"
)

REM --- 5. Chay backup ngay neu phat hien backup cu qua 1 ngay ---
if %FOUND_RECENT_DB%==1 (
    for /f %%d in ('powershell -Command "((Get-Date) - (Get-Date '%LAST_DB_DATE%')).Days"') do (
        if %%d GTR 1 (
            echo [AUTO] Backup cu %%d ngay - chay backup bu ngay... >> "%LOGFILE%"
            call "%PROJECT_DIR%\backup_local.bat"
            echo [AUTO] Backup bu hoan tat >> "%LOGFILE%"
        )
    )
)

REM --- KET QUA ---
echo. >> "%LOGFILE%"
if %ERRORS% GTR 0 (
    echo [KET QUA] %ERRORS% LOI, %WARNINGS% CANH BAO >> "%LOGFILE%"
    REM Hien thi thong bao loi cho nguoi dung
    msg * /time:30 "CANH BAO BACKUP: Phat hien %ERRORS% loi trong he thong backup! Xem chi tiet: logs\backup_health.log" 2>nul
) else if %WARNINGS% GTR 0 (
    echo [KET QUA] OK voi %WARNINGS% canh bao >> "%LOGFILE%"
) else (
    echo [KET QUA] TAT CA BINH THUONG >> "%LOGFILE%"
)
echo ======================================== >> "%LOGFILE%"
echo. >> "%LOGFILE%"
