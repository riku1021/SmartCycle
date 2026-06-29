Write-Host "SmartCycle開発環境を起動します..." -ForegroundColor Cyan
Write-Host "※このウィンドウは閉じないでください" -ForegroundColor Yellow

# Docker Compose の起動 (別ウィンドウ)
Start-Process powershell -ArgumentList "-NoExit -Command `"docker-compose up --build`""

# EV3 Monitor (またはMock) の起動 (別ウィンドウ)
Start-Process powershell -ArgumentList "-NoExit -Command `"uv run python server\scripts\ev3_touch_monitor.py`""
