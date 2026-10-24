# Anchor Startup Helper

function Start-Anchor {
    Write-Host "`n========================================================" -ForegroundColor Cyan
    Write-Host "             STARTING ANCHOR PLATFORM" -ForegroundColor Cyan
    Write-Host "========================================================`n" -ForegroundColor Cyan

    docker compose up -d

    Write-Host "`n========================================================" -ForegroundColor Green
    Write-Host "   ANCHOR IS RUNNING! OPEN THESE URLS IN YOUR BROWSER:" -ForegroundColor Green
    Write-Host "========================================================`n" -ForegroundColor Green
    Write-Host "   -> Web Dashboard:  " -NoNewline
    Write-Host "http://localhost:5173" -ForegroundColor Yellow
    Write-Host "   -> API Health:     " -NoNewline
    Write-Host "http://localhost:3001/api/health" -ForegroundColor Yellow
    Write-Host "`n   Commands:"
    Write-Host "   * View logs:  docker compose logs -f" -ForegroundColor Gray
    Write-Host "   * Stop app:   docker compose down" -ForegroundColor Gray
    Write-Host "========================================================`n" -ForegroundColor Green
}

Start-Anchor
