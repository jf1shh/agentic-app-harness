param (
    [Parameter(Mandatory=$false)]
    [string]$AppName
)

$projectsDir = Join-Path -Path $PSScriptRoot -ChildPath "..\projects"
$projectsDir = [System.IO.Path]::GetFullPath($projectsDir)

function Clean-SingleApp ($appPath) {
    if (Test-Path $appPath) {
        $appName = Split-Path $appPath -Leaf
        Write-Host "Cleaning build & test artifacts for $appName..." -ForegroundColor Cyan
        $targets = @(".next", "dist", "build", ".vite", "playwright-report", "test-results", "coverage", "tsconfig.tsbuildinfo")
        foreach ($t in $targets) {
            $item = Join-Path -Path $appPath -ChildPath $t
            if (Test-Path $item) {
                Remove-Item -Path $item -Recurse -Force -ErrorAction SilentlyContinue
            }
        }
        Write-Host "Cleaned $appName successfully." -ForegroundColor Green
    }
}

if ($AppName) {
    $targetPath = Join-Path -Path $projectsDir -ChildPath $AppName
    Clean-SingleApp $targetPath
} else {
    Write-Host "Cleaning all projects in $projectsDir..." -ForegroundColor Cyan
    Get-ChildItem -Path $projectsDir -Directory | ForEach-Object {
        Clean-SingleApp $_.FullName
    }
}
