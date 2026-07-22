# Harness Spec & Schema Coverage Validator
#
# Verifies each app against the harness mandates (see .agents/AGENTS.md):
#   1. A spec file exists in specs/ (hard requirement).
#   2. A project README exists.
#   3. Contract-first Zod: the app actually imports/uses `zod` in src/.
#   4. BDD: every *.spec.ts uses Given / When / Then structure.
#
# Unlike a presence-only check, this inspects file *content* so the report
# reflects real compliance. By default only a missing spec fails the run
# (exit 1); pass -Strict to also fail on Zod / BDD / README warnings.
param (
  [switch]$Strict
)

$RepoRoot = Resolve-Path "$PSScriptRoot\.."

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Harness Spec & Schema Coverage Audit" -ForegroundColor Cyan
if ($Strict) { Write-Host " (strict mode: warnings fail the run)" -ForegroundColor Cyan }
Write-Host "=========================================" -ForegroundColor Cyan

$ProjectsDir = Join-Path $RepoRoot "projects"
$SpecsDir = Join-Path $RepoRoot "specs"
$Projects = Get-ChildItem -Path $ProjectsDir -Directory

$PassCount = 0
$WarningCount = 0
$FailCount = 0

# Returns the TypeScript/TSX source files under a path, excluding node_modules.
function Get-SourceFiles ($root) {
  if (-not (Test-Path $root)) { return @() }
  Get-ChildItem -Path $root -Recurse -Include *.ts, *.tsx -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "[\\/]node_modules[\\/]" }
}

foreach ($project in $Projects) {
  $appName = $project.Name
  $projPath = $project.FullName
  Write-Host "`n[Audit] Checking Project: $appName" -ForegroundColor Yellow

  # 1. Spec Coverage Check (hard requirement)
  $specMatches = Get-ChildItem -Path $SpecsDir -Filter "*$appName*.md" -ErrorAction SilentlyContinue
  if ($specMatches) {
    Write-Host "  [PASS] Spec file found: $($specMatches[0].Name)" -ForegroundColor Green
    $PassCount++
  } else {
    Write-Host "  [FAIL] Missing spec file in specs/ for '$appName'" -ForegroundColor Red
    $FailCount++
  }

  # 2. README.md Check
  $readmePath = Join-Path $projPath "README.md"
  if (Test-Path $readmePath) {
    Write-Host "  [PASS] Project README.md present" -ForegroundColor Green
    $PassCount++
  } else {
    Write-Host "  [WARN] Missing README.md in projects/$appName" -ForegroundColor Yellow
    $WarningCount++
  }

  # 3. Contract-First Zod Check (inspect content, not just filenames)
  $srcPath = Join-Path $projPath "src"
  $sourceFiles = Get-SourceFiles $srcPath
  $zodFile = $null
  foreach ($f in $sourceFiles) {
    $content = Get-Content -Path $f.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -match "from\s+['""]zod['""]" -or $content -match "z\.(object|infer|string|number|boolean|enum|array)\b") {
      $zodFile = $f
      break
    }
  }
  if ($zodFile) {
    $rel = $zodFile.FullName.Substring($projPath.Length).TrimStart('\', '/')
    Write-Host "  [PASS] Zod runtime schemas in use: $rel" -ForegroundColor Green
    $PassCount++
  } elseif ($sourceFiles.Count -eq 0) {
    Write-Host "  [WARN] No src/ TypeScript files found in projects/$appName" -ForegroundColor Yellow
    $WarningCount++
  } else {
    Write-Host "  [WARN] No Zod usage found in projects/$appName/src (contract-first mandate not met)" -ForegroundColor Yellow
    $WarningCount++
  }

  # 4. BDD Format Check across ALL spec files
  $specFiles = Get-ChildItem -Path $projPath -Recurse -Filter "*.spec.ts" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "[\\/]node_modules[\\/]" }
  if (-not $specFiles) {
    Write-Host "  [WARN] No E2E *.spec.ts tests found in projects/$appName" -ForegroundColor Yellow
    $WarningCount++
  } else {
    $compliant = @()
    $nonCompliant = @()
    foreach ($sf in $specFiles) {
      $content = Get-Content -Path $sf.FullName -Raw -ErrorAction SilentlyContinue
      if ($content -match "(?i)given" -and $content -match "(?i)when" -and $content -match "(?i)then") {
        $compliant += $sf.Name
      } else {
        $nonCompliant += $sf.Name
      }
    }
    if ($nonCompliant.Count -eq 0) {
      Write-Host "  [PASS] BDD Given-When-Then verified in all $($specFiles.Count) spec file(s)" -ForegroundColor Green
      $PassCount++
    } else {
      Write-Host "  [WARN] $($compliant.Count)/$($specFiles.Count) spec file(s) BDD-compliant; missing Given-When-Then: $($nonCompliant -join ', ')" -ForegroundColor Yellow
      $WarningCount++
    }
  }
}

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host " Audit Summary: $PassCount Passed | $WarningCount Warnings | $FailCount Failures" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

if ($FailCount -gt 0) {
  exit 1
} elseif ($Strict -and $WarningCount -gt 0) {
  Write-Host "Strict mode: failing run due to $WarningCount warning(s)." -ForegroundColor Red
  exit 1
} else {
  exit 0
}
