@echo off
REM === BACKUP DATABASE LEN GOOGLE DRIVE ===
set SOURCE_DIR=d:\0 - Google Antigravity\11 - NHAN VIEN KINH DOANH - Copy\backups
set DEST_DIR=G:\BACKUP_HV\database

REM Tao backup moi truoc
set BACKUP_DIR=d:\0 - Google Antigravity\11 - NHAN VIEN KINH DOANH - Copy\backups
for /f %%a in ('powershell -Command "Get-Date -Format yyyyMMdd_HHmm"') do set TIMESTAMP=%%a
set FILENAME=db_%TIMESTAMP%.sql

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
docker exec postgres-hv pg_dump -U adminhv dongphuchv > "%BACKUP_DIR%\%FILENAME%"

REM Copy len Google Drive
if not exist "%DEST_DIR%" mkdir "%DEST_DIR%"
robocopy "%SOURCE_DIR%" "%DEST_DIR%" *.sql /S /XO /NJH /NJS /NDL /NC /NS

echo [OK] Backup database len Google Drive thanh cong: %DEST_DIR%
