# Master Harness CLI - Unified Monorepo Execution Tool
param (
  [Parameter(Position=0)]
  [string]$Command = "help",

  [Parameter(Position=1)]
  [string]$Target = "",

  [Parameter(Position=2)]
  [string]$ExtraArg = ""
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path "$PSScriptRoot\.."

function Show-Help {
  Write-Host "=========================================" -ForegroundColor Cyan
  Write-Host " Agentic App Harness CLI (v1.0.0)" -ForegroundColor Cyan
  Write-Host "=========================================" -ForegroundColor Cyan
  Write-Host "Usage: .\scripts\harness.ps1 <command> [target]" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Available Commands:" -ForegroundColor White
  Write-Host "  test all          - Run harness security, lint, tsc, Vitest & Playwright tests across ALL apps" -ForegroundColor Gray
  Write-Host "  test <appName>    - Run harness tests for a specific application" -ForegroundColor Gray
  Write-Host "  validate          - Run static spec & schema coverage validator" -ForegroundColor Gray
  Write-Host "  clean             - Clean build caches and test reports across all projects" -ForegroundColor Gray
  Write-Host "  scaffold <name>   - Scaffold a new app specification and project boilerplate" -ForegroundColor Gray
  Write-Host "  mobile <appName>  - Build & sync Capacitor native Android assets for an app" -ForegroundColor Gray
  Write-Host "  help              - Show this help message" -ForegroundColor Gray
  Write-Host ""
}

switch ($Command.ToLower()) {
  "help" {
    Show-Help
  }

  "clean" {
    Write-Host "Running Monorepo-Wide Build Cleanup..." -ForegroundColor Cyan
    & "$PSScriptRoot\clean-app.ps1"
  }

  "validate" {
    Write-Host "Running Harness Spec & Schema Coverage Validator..." -ForegroundColor Cyan
    & "$PSScriptRoot\validate-specs.ps1"
  }

  "test" {
    if ($Target -eq "all" -or $Target -eq "") {
      Write-Host "Running Master Harness Suite Across ALL Monorepo Applications..." -ForegroundColor Cyan
      $apps = Get-ChildItem -Path "$RepoRoot\projects" -Directory | Select-Object -ExpandProperty Name
      foreach ($app in $apps) {
        Write-Host "`n---> Testing App: $app <---" -ForegroundColor Yellow
        & "$PSScriptRoot\test-app.ps1" -AppName $app
      }
    } else {
      & "$PSScriptRoot\test-app.ps1" -AppName $Target
    }
  }

  "scaffold" {
    if ([string]::IsNullOrWhiteSpace($Target)) {
      Write-Error "Please specify an app name to scaffold. Example: .\scripts\harness.ps1 scaffold my-new-app"
    } else {
      & "$PSScriptRoot\scaffold-app.ps1" -AppName $Target
    }
  }

  "mobile" {
    if ([string]::IsNullOrWhiteSpace($Target)) {
      Write-Error "Please specify an app name for mobile build. Example: .\scripts\harness.ps1 mobile mood-diner"
    } else {
      & "$PSScriptRoot\build-mobile.ps1" -AppName $Target
    }
  }

  default {
    Write-Host "Unknown command '$Command'." -ForegroundColor Red
    Show-Help
  }
}
