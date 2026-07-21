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

Set-Location $targetPath

Write-Host "========================================="
Write-Host "Running Harness Testing Suite for $AppName"
Write-Host "========================================="

$errors = 0

if (-Not (Test-Path "node_modules")) {
    Write-Host "`n[0/5] Installing dependencies..." -ForegroundColor Cyan
    npm install
}

Write-Host "`n[1/5] Running Security & Dependency Audit (npm audit)..." -ForegroundColor Cyan
npm audit --audit-level=high
if ($LASTEXITCODE -ne 0) {
    Write-Host "SECURITY AUDIT FAILED" -ForegroundColor Red
    $errors++
} else {
    Write-Host "SECURITY AUDIT PASSED" -ForegroundColor Green
}

Write-Host "`n[2/5] Running Code Linting & Static Analysis..." -ForegroundColor Cyan
npm run lint
if ($LASTEXITCODE -ne 0) {
    Write-Host "LINTING FAILED" -ForegroundColor Red
    $errors++
} else {
    Write-Host "LINTING PASSED" -ForegroundColor Green
}

Write-Host "`n[3/5] Running Type Checking (tsc)..." -ForegroundColor Cyan
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    Write-Host "TYPE CHECKING FAILED" -ForegroundColor Red
    $errors++
} else {
    Write-Host "TYPE CHECKING PASSED" -ForegroundColor Green
}

Write-Host "`n[4/5] Running Unit Tests (Vitest)..." -ForegroundColor Cyan
npx vitest run
if ($LASTEXITCODE -ne 0) {
    Write-Host "UNIT TESTS FAILED" -ForegroundColor Red
    $errors++
} else {
    Write-Host "UNIT TESTS PASSED" -ForegroundColor Green
}

Write-Host "`n[5/5] Running E2E & Accessibility Tests (Playwright)..." -ForegroundColor Cyan
npx playwright install --with-deps
npx playwright test
if ($LASTEXITCODE -ne 0) {
    Write-Host "E2E & A11Y TESTS FAILED" -ForegroundColor Red
    $errors++
} else {
    Write-Host "E2E & A11Y TESTS PASSED" -ForegroundColor Green
}

Write-Host "`n========================================="
if ($errors -eq 0) {
    Write-Host "ALL HARNESS CHECKS PASSED FOR $AppName!" -ForegroundColor Green
} else {
    Write-Host "$errors CHECKS FAILED. Please review the logs above." -ForegroundColor Red
    exit 1
}
