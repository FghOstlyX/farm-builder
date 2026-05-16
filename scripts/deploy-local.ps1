# Локальный деплой: сервер + Cloudflare Tunnel + настройка Telegram
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Создан .env — вставьте BOT_TOKEN из @BotFather и запустите снова." -ForegroundColor Yellow
  notepad .env
  exit 1
}

$envContent = Get-Content ".env" -Raw
if ($envContent -notmatch "BOT_TOKEN=\S+") {
  Write-Host "Укажите BOT_TOKEN в .env" -ForegroundColor Red
  exit 1
}

npm run build | Out-Host

$npm = (Get-Command npm.cmd).Source

Write-Host "`nЗапуск сервера на :3000..." -ForegroundColor Green
$server = Start-Process -FilePath $npm -ArgumentList "run","dev" -WorkingDirectory $root -PassThru -WindowStyle Hidden

Start-Sleep -Seconds 3

Write-Host "Запуск туннеля tunnelmole (без страницы loca.lt)..." -ForegroundColor Green
$tunnelLog = Join-Path $root "data\tunnelmole.log"
New-Item -ItemType Directory -Force -Path (Split-Path $tunnelLog) | Out-Null
$tunnel = Start-Process -FilePath $npm -ArgumentList "exec","--yes","tunnelmole","3000" -WorkingDirectory $root -RedirectStandardOutput $tunnelLog -PassThru -WindowStyle Hidden

Write-Host "Ожидание URL туннеля (до 40 сек)..." -ForegroundColor Cyan
$url = $null
for ($i = 0; $i -lt 40; $i++) {
  Start-Sleep -Seconds 1
  if (Test-Path $tunnelLog) {
    $m = Select-String -Path $tunnelLog -Pattern "https://[a-z0-9.-]+\.tunnelmole\.net" | Select-Object -First 1
    if ($m) { $url = $m.Matches[0].Value; break }
  }
}

if (-not $url) {
  Write-Host "Не удалось получить URL. Смотрите $tunnelLog" -ForegroundColor Red
  Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
  Stop-Process -Id $tunnel.Id -Force -ErrorAction SilentlyContinue
  exit 1
}

Write-Host "Публичный URL: $url" -ForegroundColor Green
$env:WEBAPP_URL = $url
(Get-Content ".env") -replace '^WEBAPP_URL=.*', "WEBAPP_URL=$url" | Set-Content ".env"
if ((Get-Content ".env" -Raw) -notmatch "WEBAPP_URL=") {
  Add-Content ".env" "WEBAPP_URL=$url"
}

npm run setup:telegram | Out-Host

Write-Host "`n=== Готово ===" -ForegroundColor Green
Write-Host "1. Откройте бота в Telegram и нажмите /start"
Write-Host "2. В @BotFather укажите URL Mini App: $url/miniapp"
Write-Host "3. Сервер PID: $($server.Id), туннель PID: $($tunnel.Id)"
Write-Host "   Остановка: Stop-Process -Id $($server.Id),$($tunnel.Id)"
