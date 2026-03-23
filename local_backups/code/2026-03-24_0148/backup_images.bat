@echo off
REM === BACKUP ANH LEN GOOGLE DRIVE ===
set SOURCE=d:\0 - Google Antigravity\11 - NHAN VIEN KINH DOANH - Copy\uploads
set DEST=G:\BACKUP_HV\uploads

if not exist "%SOURCE%" (
    echo [INFO] Thu muc uploads chua co anh nao.
    exit /b
)

if not exist "%DEST%" mkdir "%DEST%"

REM Copy chi file moi/thay doi (khong copy lai file cu)
robocopy "%SOURCE%" "%DEST%" /S /XO /NJH /NJS /NDL /NC /NS

echo [OK] Backup anh len Google Drive thanh cong: %DEST%
