@echo off
REM === BACKUP TAT CA LEN GOOGLE DRIVE - 21H MOI TOI ===

echo ============================================
echo  BACKUP HE THONG - %date% %time%
echo ============================================

REM Lay ngay hien tai
for /f %%a in ('powershell -Command "Get-Date -Format yyyyMMdd_HHmm"') do set TIMESTAMP=%%a
for /f %%a in ('powershell -Command "Get-Date -Format yyyy-MM-dd"') do set TODAY=%%a
set FILENAME=db_%TIMESTAMP%.sql

REM --- 1. BACKUP DATABASE ---
set "DB_BACKUP_DIR=d:\0 - Google Antigravity\11 - NHAN VIEN KINH DOANH - Copy\backups\%TODAY%"
set "DB_DRIVE_DIR=I:\My Drive\BACKUP_HV\database\%TODAY%"

if not exist "%DB_BACKUP_DIR%" mkdir "%DB_BACKUP_DIR%"
if not exist "%DB_DRIVE_DIR%" mkdir "%DB_DRIVE_DIR%"

docker exec postgres-hv pg_dump -U adminhv dongphuchv > "%DB_BACKUP_DIR%\%FILENAME%"
echo [1/3] Database backup: %TODAY%\%FILENAME%

REM Copy DB len Google Drive
copy /Y "%DB_BACKUP_DIR%\%FILENAME%" "%DB_DRIVE_DIR%\%FILENAME%"
echo [2/3] Database - Google Drive OK

REM --- 2. BACKUP ANH ---
set "IMG_SOURCE=d:\0 - Google Antigravity\11 - NHAN VIEN KINH DOANH - Copy\uploads"
set "IMG_DEST=I:\My Drive\BACKUP_HV\uploads"

if exist "%IMG_SOURCE%" (
    if not exist "%IMG_DEST%" mkdir "%IMG_DEST%"
    robocopy "%IMG_SOURCE%" "%IMG_DEST%" /S /XO /NJH /NJS /NDL /NC /NS
    echo [3/3] Anh - Google Drive OK
) else (
    echo [3/3] Chua co anh upload
)

REM --- XOA BACKUP CU HON 30 NGAY ---
forfiles /p "d:\0 - Google Antigravity\11 - NHAN VIEN KINH DOANH - Copy\backups" /d -30 /c "cmd /c if @isdir==TRUE rd /s /q @file" 2>nul
forfiles /p "I:\My Drive\BACKUP_HV\database" /d -30 /c "cmd /c if @isdir==TRUE rd /s /q @file" 2>nul

echo ============================================
echo  HOAN TAT BACKUP!
echo ============================================
