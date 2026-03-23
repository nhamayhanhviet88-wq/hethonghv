@echo off
REM === BACKUP DATABASE DAILY ===
REM Luu file SQL vao thu muc backups/

set BACKUP_DIR=d:\0 - Google Antigravity\11 - NHAN VIEN KINH DOANH - Copy\backups
set DATE=%date:~6,4%-%date:~3,2%-%date:~0,2%
set TIME=%time:~0,2%-%time:~3,2%
set FILENAME=db_backup_%DATE%_%TIME%.sql

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM Dung pg_dump tu Docker container
docker exec -i postgres-dongphuchv pg_dump -U adminhv dongphuchv > "%BACKUP_DIR%\%FILENAME%"

echo Backup thanh cong: %BACKUP_DIR%\%FILENAME%

REM Xoa backup cu hon 30 ngay
forfiles /p "%BACKUP_DIR%" /m *.sql /d -30 /c "cmd /c del @file" 2>nul

echo Backup xong!
pause
