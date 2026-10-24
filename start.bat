@echo off
echo ========================================================
echo               STARTING ANCHOR PLATFORM
echo ========================================================
echo.

docker compose up -d

echo.
echo ========================================================
echo   ANCHOR IS RUNNING! OPEN THESE URLS IN YOUR BROWSER:
echo ========================================================
echo.
echo   * Web Dashboard:  http://localhost:5173
echo   * API Health:     http://localhost:3001/api/health
echo.
echo   To view live logs:   docker compose logs -f
echo   To stop all:         docker compose down
echo ========================================================
echo.
pause
