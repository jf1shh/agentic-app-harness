param (
    [Parameter(Mandatory=$true)]
    [string]$AppName,

    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$Rest
)

# Thin wrapper. The suite itself lives in test-app.mjs (zero-dependency Node
# ESM) so it runs anywhere Node does — including the Linux containers agents
# work in, where `pwsh` is often absent and this script could not run at all.
# This wrapper is kept so existing CI steps, docs, and muscle memory
# (`.\scripts\test-app.ps1 -AppName <App>`) keep working unchanged.

$runner = Join-Path -Path $PSScriptRoot -ChildPath "test-app.mjs"

node $runner --app $AppName @Rest
exit $LASTEXITCODE
