$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'tool-path.ps1')
Push-Location (Split-Path -Parent $PSScriptRoot)
$previousCompiler = $env:WSD_MAKENSIS
try {
    $env:WSD_MAKENSIS = & (Join-Path $PSScriptRoot 'setup-nsis.ps1')
    & wails3 task package
    if ($LASTEXITCODE -ne 0) { throw 'Windows 설치 패키지를 만들지 못했습니다.' }
} finally {
    $env:WSD_MAKENSIS = $previousCompiler
    Pop-Location
}
