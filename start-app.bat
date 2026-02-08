@echo off
echo ======================================
echo   資産管理アプリ - 起動中...
echo ======================================
echo.

REM 既存のサーバープロセスを停止
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

REM サーバーをバックグラウンドで起動
start /B python server.py

REM サーバーが起動するまで少し待つ
timeout /t 2 /nobreak >nul

REM ブラウザでアプリを開く
start http://localhost:8000

echo.
echo アプリをブラウザで開きました
echo.
echo サーバーを停止するには、このウィンドウを閉じてください
echo または Ctrl+C を押してください
echo.

REM ウィンドウを開いたまま待機
pause >nul
