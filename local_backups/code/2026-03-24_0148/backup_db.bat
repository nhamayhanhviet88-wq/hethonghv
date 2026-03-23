@echo off
REM === BACKUP DATABASE HANG NGAY ===
set BACKUP_DIR=d:\0 - Google Antigravity\11 - NHAN VIEN KINH DOANH - Copy\backups

REM Get timestamp using powershell for consistent format
for /f %%a in ('powershell -Command "Get-Date -Format yyyyMMdd_HHmm"') do set TIMESTAMP=%%a
set FILENAME=db_%TIMESTAMP%.sql

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM Backup tu Docker container postgres-hv
docker exec postgres-hv pg_dump -U adminhv dongphuchv > "%BACKUP_DIR%\%FILENAME%"

if %errorlevel% equ 0 (
    echo [OK] Backup thanh cong: %BACKUP_DIR%\%FILENAME%
) else (
    echo [LOI] Backup that bai!
)

REM Xoa backup cu hon 30 ngay
forfiles /p "%BACKUP_DIR%" /m *.sql /d -30 /c "cmd /c del @file" 2>nul
