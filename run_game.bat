@echo off
chcp 65001 > nul
echo ===================================================
echo [3초 분리수거 대작전] 로컬 게임 서버를 구동합니다...
echo ===================================================
powershell -ExecutionPolicy Bypass -File "%~dp0start_server.ps1"
pause
