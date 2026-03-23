@echo off
REM === BACKUP CODE LEN GIT ===
cd /d "d:\0 - Google Antigravity\11 - NHAN VIEN KINH DOANH - Copy"

git add -A
git commit -m "Auto backup %date% %time%"
git push origin main

echo Push code len GitHub thanh cong!
pause
