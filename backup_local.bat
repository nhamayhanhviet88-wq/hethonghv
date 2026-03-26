@echo off
REM === LOCAL BACKUP - 50 BAN GAN NHAT (CODE + DATABASE) ===
REM Chay moi 15 phut, giu toi da 50 ban
REM Updated: su dung node pg_dump thay docker exec

set "PROJECT_DIR=d:\0 - Google Antigravity\11 - NHAN VIEN KINH DOANH - Copy"
set "BACKUP_ROOT=%PROJECT_DIR%\local_backups"
set "CODE_BACKUP_DIR=%BACKUP_ROOT%\code"
set "DB_BACKUP_DIR=%BACKUP_ROOT%\database"
set MAX_BACKUPS=50

REM Lay timestamp
for /f %%a in ('powershell -Command "Get-Date -Format yyyy-MM-dd_HHmm"') do set TIMESTAMP=%%a

REM Tao thu muc
if not exist "%CODE_BACKUP_DIR%" mkdir "%CODE_BACKUP_DIR%"
if not exist "%DB_BACKUP_DIR%" mkdir "%DB_BACKUP_DIR%"

REM --- 1. BACKUP CODE ---
set "CODE_DEST=%CODE_BACKUP_DIR%\%TIMESTAMP%"
robocopy "%PROJECT_DIR%" "%CODE_DEST%" /S /XD node_modules .git local_backups backups uploads appstest /XF *.db /NJH /NJS /NDL /NC /NS >nul 2>&1

REM --- 2. BACKUP DATABASE (via node script) ---
node "%PROJECT_DIR%\backup_db_node.js" "%DB_BACKUP_DIR%\db_%TIMESTAMP%.sql"

REM --- 3. XOA BAN CU (GIU 50 BAN CODE) ---
powershell -Command "$dirs = Get-ChildItem '%CODE_BACKUP_DIR%' -Directory | Sort-Object Name; if ($dirs.Count -gt %MAX_BACKUPS%) { $dirs[0..($dirs.Count - %MAX_BACKUPS% - 1)] | Remove-Item -Recurse -Force }"

REM --- 4. XOA BAN CU (GIU 50 BAN DB) ---
powershell -Command "$files = Get-ChildItem '%DB_BACKUP_DIR%' -File *.sql | Sort-Object Name; if ($files.Count -gt %MAX_BACKUPS%) { $files[0..($files.Count - %MAX_BACKUPS% - 1)] | Remove-Item -Force }"

echo [%TIMESTAMP%] Local backup OK - Code + DB
