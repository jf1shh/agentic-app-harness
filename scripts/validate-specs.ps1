# Harness Spec & Schema Coverage Validator
$RepoRoot = Resolve-Path "$PSScriptRoot\.."

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Harness Spec & Schema Coverage Audit" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$ProjectsDir = Join-Path $RepoRoot "projects"
$SpecsDir = Join-Path $RepoRoot "specs"
$Projects = Get-ChildItem -Path $ProjectsDir -Directory

$PassCount = 0
$WarningCount = 0
$FailCount = 0

foreach ($project in $Projects) {
  $appName = $project.Name
  $projPath = $project.FullName
  Write-Host "`n[Audit] Checking Project: $appName" -ForegroundColor Yellow

  # 1. Spec Coverage Check
  $specMatches = Get-ChildItem -Path $SpecsDir -Filter "*$appName*.md" -ErrorAction SilentlyContinue
  if ($specMatches) {
    Write-Host "  [PASS] Spec File Found: $($specMatches[0].Name)" -ForegroundColor Green
    $PassCount++
  } else {
    Write-Host "  [FAIL] Missing Spec File in specs/ for '$appName'" -ForegroundColor Red
    $FailCount++
  }

  # 2. README.md Check
  $readmePath = Join-Path $projPath "README.md"
  if (Test-Path $readmePath) {
    Write-Host "  [PASS] Project README.md Present" -ForegroundColor Green
    $PassCount++
  } else {
    Write-Host "  [WARN] Missing README.md in projects/$appName" -ForegroundColor Yellow
    $WarningCount++
  }

  # 3. Zod Schema Check
  $srcPath = Join-Path $projPath "src"
  if (Test-Path $srcPath) {
    $schemaFiles = Get-ChildItem -Path $srcPath -Recurse -Filter "*schema*.ts" -ErrorAction SilentlyContinue
    if ($schemaFiles) {
      Write-Host "  [PASS] Zod Schema Defined: $($schemaFiles[0].Name)" -ForegroundColor Green
      $PassCount++
    } else {
      Write-Host "  [WARN] No Zod Schema file found in projects/$appName/src" -ForegroundColor Yellow
      $WarningCount++
    }
  } else {
    Write-Host "  [WARN] No src directory found in projects/$appName" -ForegroundColor Yellow
    $WarningCount++
  }

  # 4. BDD Test Format Check
  $e2eFiles = Get-ChildItem -Path $projPath -Recurse -Filter "*.spec.ts" -ErrorAction SilentlyContinue
  if ($e2eFiles) {
    $content = Get-Content -Path $e2eFiles[0].FullName -Raw
    if ($content -match "Given" -and $content -match "When" -and $content -match "Then") {
      Write-Host "  [PASS] BDD Given-When-Then Format Verified in E2E Specs" -ForegroundColor Green
      $PassCount++
    } else {
      Write-Host "  [WARN] E2E Spec found but missing explicit BDD Given-When-Then annotations" -ForegroundColor Yellow
      $WarningCount++
    }
  } else {
    Write-Host "  [WARN] No E2E *.spec.ts test found in projects/$appName" -ForegroundColor Yellow
    $WarningCount++
  }
}

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host " Audit Summary: $PassCount Checks Passed | $WarningCount Warnings | $FailCount Failures" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

if ($FailCount -gt 0) {
  exit 1
} else {
  exit 0
}
