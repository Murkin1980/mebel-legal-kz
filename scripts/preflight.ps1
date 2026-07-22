$ErrorActionPreference = 'Stop'

$nodeMajor = [int](& node -p "Number(process.versions.node.split('.')[0])")
if ($LASTEXITCODE -ne 0 -or $nodeMajor -lt 22) {
    Write-Error 'Node.js 22 or newer is required.'
    exit 1
}

$steps = @(
    @{ Name = 'Lint'; Arguments = @('run', 'lint') },
    @{ Name = 'TypeScript'; Arguments = @('run', 'typecheck') },
    @{ Name = 'Unit tests'; Arguments = @('run', 'test') },
    @{ Name = 'Integration tests'; Arguments = @('run', 'test:integration') },
    @{ Name = 'Security tests'; Arguments = @('run', 'test:security') },
    @{ Name = 'Real-DB security tests'; Arguments = @('run', 'test:security:realdb') },
    @{ Name = 'Next.js build'; Arguments = @('run', 'build') },
    @{ Name = 'Cloudflare build'; Arguments = @('run', 'cf:build') }
)

foreach ($step in $steps) {
    Write-Host "`n==> $($step.Name)" -ForegroundColor Cyan
    & npm.cmd @($step.Arguments)
    if ($LASTEXITCODE -ne 0) {
        Write-Error "$($step.Name) failed with exit code $LASTEXITCODE."
        exit $LASTEXITCODE
    }
}

Write-Host "`nPreflight passed." -ForegroundColor Green
