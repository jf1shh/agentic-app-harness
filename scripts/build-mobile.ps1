param (
    [Parameter(Mandatory=$true)]
    [string]$AppName
)

$targetPath = Join-Path -Path $PSScriptRoot -ChildPath "..\projects\$AppName"
$targetPath = [System.IO.Path]::GetFullPath($targetPath)

if (-Not (Test-Path $targetPath)) {
    Write-Host "Error: Project $AppName does not exist at $targetPath" -ForegroundColor Red
    exit 1
}

# Push-Location (not Set-Location) so the caller's working directory is restored
# on exit instead of leaking runspace-wide.
Push-Location $targetPath

Write-Host "========================================="
Write-Host "Building Mobile Container (Capacitor & PWA) for $AppName"
Write-Host "========================================="

# 1. Install Capacitor dependencies if not present
if (-Not (Test-Path "node_modules/@capacitor/core")) {
    Write-Host "`n[1/5] Installing Capacitor Core & Android CLI..." -ForegroundColor Cyan
    npm install @capacitor/core --legacy-peer-deps
    npm install -D @capacitor/cli @capacitor/android --legacy-peer-deps
}

# 2. Check or initialize Capacitor config
$capConfig = Join-Path $targetPath "capacitor.config.json"
if (-Not (Test-Path $capConfig)) {
    Write-Host "`n[2/5] Initializing Capacitor config..." -ForegroundColor Cyan
    $sanitizedId = $AppName.Replace("-", "")
    npx cap init "$AppName" "com.harness.$sanitizedId" --web-dir "dist"
}

# 3. Build production web bundle
Write-Host "`n[3/5] Compiling production web bundle (npm run build)..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "BUILD FAILED. Aborting mobile sync." -ForegroundColor Red
    Pop-Location
    exit 1
}

# 4. Add Android platform if missing
if (-Not (Test-Path "android")) {
    Write-Host "`n[4/5] Adding Android native platform..." -ForegroundColor Cyan
    npx cap add android
}

# 5. Sync web bundle to Android container
Write-Host "`n[5/5] Syncing web bundle to Android native container..." -ForegroundColor Cyan
npx cap sync android

# Restore the caller's working directory (see Push-Location above).
Pop-Location

Write-Host "`n========================================="
Write-Host "MOBILE BUILD COMPLETE FOR $AppName!" -ForegroundColor Green
Write-Host "Native Android project is ready at: $targetPath\android" -ForegroundColor Yellow
Write-Host "To open in Android Studio, run: npx cap open android" -ForegroundColor Yellow
