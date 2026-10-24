#Requires -Version 5.1
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$releaseRepository = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$releaseCommitMessage = 'feat: complete architecture polish, code simplification, and production release documentation'

function Invoke-ReleaseCommand {
    param([string]$Command, [string[]]$Arguments)
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Command failed with exit code $LASTEXITCODE. Release preparation stopped."
    }
}

Push-Location -LiteralPath $releaseRepository
try {
    $branch = (Invoke-ReleaseCommand 'git' @('branch', '--show-current')).Trim()
    if ($branch -ne 'main') { throw 'Run release preparation on the main branch.' }
    $origin = (Invoke-ReleaseCommand 'git' @('remote', 'get-url', 'origin')).Trim()
    if ($origin -notin @('https://github.com/yousefattaff/YousefAlsayed-DigitalTwin.git', 'git@github.com:yousefattaff/YousefAlsayed-DigitalTwin.git')) {
        throw 'The origin does not match the Digital Twin repository.'
    }
    $initialStaged = @(Invoke-ReleaseCommand 'git' @('diff', '--cached', '--name-only'))
    if ($initialStaged.Count) { throw 'Review existing staged changes and clear the index before running this release helper.' }

    Push-Location -LiteralPath (Join-Path $releaseRepository 'frontend')
    try {
        Invoke-ReleaseCommand 'npm' @('ci', '--include=dev')
        Invoke-ReleaseCommand 'npm' @('test')
        Invoke-ReleaseCommand 'npm' @('run', 'lint')
        Invoke-ReleaseCommand 'npm' @('run', 'build')
        Invoke-ReleaseCommand 'npm' @('run', 'release:check')
    }
    finally { Pop-Location }

    Push-Location -LiteralPath (Join-Path $releaseRepository 'backend')
    try {
        Invoke-ReleaseCommand 'uv' @('sync', '--frozen', '--no-dev')
        Invoke-ReleaseCommand 'uv' @('run', '--frozen', '--no-dev', 'python', '-m', 'unittest', 'discover', '-s', 'tests')
        Invoke-ReleaseCommand 'uv' @('run', '--frozen', '--no-dev', 'python', '-m', 'py_compile', 'server.py', 'lambda_handler.py', 'deploy.py')
    }
    finally { Pop-Location }
    Invoke-ReleaseCommand 'terraform' @('-chdir=backend/terraform', 'fmt', '-check', '-recursive')
    Invoke-ReleaseCommand 'git' @('diff', '--check')

    # Include the canonical project and tracked deletions from the restructuring.
    $scopes = @('.github', '.gitignore', '.dockerignore', 'README.md', 'DEPLOYMENT_PLAN.md',
        'docs', 'frontend', 'content', 'backend', 'render.yaml', '.vscode',
        'PLAN.md', 'terraform', 'tutor.md', 'scratch_imgs')
    $trackedPaths = @(Invoke-ReleaseCommand 'git' @('ls-files'))
    $stagePaths = @($scopes | Where-Object {
        $scope = $_
        (Test-Path -LiteralPath (Join-Path $releaseRepository $scope)) -or
            @($trackedPaths | Where-Object { $_ -eq $scope -or $_.StartsWith("$scope/") }).Count -gt 0
    })
    Invoke-ReleaseCommand 'git' (@('add', '--all', '--') + $stagePaths)
    Invoke-ReleaseCommand 'git' @('diff', '--cached', '--check')

    Push-Location -LiteralPath (Join-Path $releaseRepository 'frontend')
    try { Invoke-ReleaseCommand 'npm' @('run', 'release:check') }
    finally { Pop-Location }
    Invoke-ReleaseCommand 'git' @('diff', '--cached', '--name-status')

    $staged = @(Invoke-ReleaseCommand 'git' @('diff', '--cached', '--name-only'))
    if ($staged.Count) {
        Invoke-ReleaseCommand 'git' @('commit', '-m', $releaseCommitMessage)
        Invoke-ReleaseCommand 'git' @('log', '-1', '--format=%h %s')
    }
    else { Write-Host 'No release changes to commit.' }
    Invoke-ReleaseCommand 'git' @('status', '--short')
    Write-Host 'Release checks passed. Push the reviewed commit with: git push origin main'
}
finally { Pop-Location }
