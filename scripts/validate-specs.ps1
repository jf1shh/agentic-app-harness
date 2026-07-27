param (
  [switch]$Strict
)

# Thin wrapper. The audit itself lives in validate-specs.mjs (zero-dependency
# Node ESM) so it runs anywhere Node does — including the Linux containers
# agents work in, where `pwsh` is often absent and this script could not run.
#
# This file previously re-implemented all four SDD mandates in PowerShell,
# duplicating regexes that harness-status.mjs already owns as sensors 1-4. Two
# copies of one rule set drift silently, and this copy was the last reason the
# SDD Sentinel job needed a Windows runner. The Node version presents the
# sensors' findings instead of re-detecting them, so there is one place where
# compliance is decided.
#
# Kept so existing CI steps, docs, and muscle memory
# (`.\scripts\validate-specs.ps1 -Strict`) keep working unchanged.

$runner = Join-Path -Path $PSScriptRoot -ChildPath "validate-specs.mjs"

if ($Strict) {
  node $runner --strict
} else {
  node $runner
}
exit $LASTEXITCODE
