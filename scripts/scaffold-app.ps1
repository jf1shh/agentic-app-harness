param (
    [Parameter(Mandatory=$true)]
    [string]$AppName
)

$targetPath = Join-Path -Path $PSScriptRoot -ChildPath "..\projects\$AppName"
$targetPath = [System.IO.Path]::GetFullPath($targetPath)

if (Test-Path $targetPath) {
    Write-Host "Error: Project $AppName already exists at $targetPath" -ForegroundColor Red
    exit 1
}

New-Item -ItemType Directory -Force -Path $targetPath | Out-Null
Write-Host "Created project directory: $targetPath" -ForegroundColor Green

# Create a default README pointing to the spec
$readmePath = Join-Path -Path $targetPath -ChildPath "README.md"
$readmeContent = @"
# $AppName

This project was scaffolded by the Agentic App Harness.
Please refer to `specs/$AppName-spec.md` for the single source of truth regarding architecture and requirements.
"@
Set-Content -Path $readmePath -Value $readmeContent

Write-Host "Scaffolding complete. To initialize a specific framework, run 'npx' or 'npm create' within the $targetPath directory." -ForegroundColor Green
Write-Host "NOTE: When you initialize the app, remember to install the harness test suite: npm install -D vitest @testing-library/react @testing-library/dom jsdom eslint-plugin-security @next/bundle-analyzer @playwright/test @axe-core/playwright" -ForegroundColor Yellow
