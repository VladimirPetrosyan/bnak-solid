# HayHome - zapusk backend (Go, :8080) i frontenda (Vite, :5173) dlya razrabotki odnoy komandoy.
#
# Ispolzovanie:
#   .\dev.ps1
#
# Otkryvaet dva otdelnykh okna PowerShell - po odnomu na protsess, s zhivymi logami.
# Chtoby ostanovit - zakroyte sootvetstvuyushchee okno (ili Ctrl+C vnutri nego).

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

# backend/.env.local - lokalnye sekrety (klyuchi API i t.p.), ne popadaet v git (sm. .gitignore).
# Esli fayla net - prosto propuskaetsya, backend startuet bez etikh peremennykh.
$backendEnvFile = "$root\backend\.env.local"
$loadEnvLocal = ''
if (Test-Path $backendEnvFile) {
    $loadEnvLocal = 'Get-Content ''' + $backendEnvFile + ''' | Where-Object { $_ -notmatch ''^\s*#'' -and $_.Trim() -ne '''' } | ForEach-Object { $k, $v = $_ -split ''='', 2; Set-Item ("Env:" + $k.Trim()) $v.Trim() }; '
}

Write-Host "Zapuskayu backend (http://localhost:8080)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList '-NoExit', '-Command', "cd '$root\backend'; `$env:DEV_MODE = '1'; $loadEnvLocal go run ." -WindowStyle Normal

Write-Host "Zapuskayu frontend (http://localhost:5173)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList '-NoExit', '-Command', "cd '$root'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "Gotovo. Backend: http://localhost:8080   Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "Oba protsessa - v otdelnykh oknakh; zakroyte okno, chtoby ostanovit nuzhnyy server."
