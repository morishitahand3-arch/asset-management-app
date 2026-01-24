@echo off
echo ======================================
echo   資産管理アプリ - 起動中...
echo ======================================
echo.

REM サーバーをバックグラウンドで起動
start /B python -m http.server 8000

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

REM サーバープロセスが終了するまで待機
python -m http.server 8000
