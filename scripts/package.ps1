param([string]$SigningThumbprint)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'tool-path.ps1')
Push-Location (Split-Path -Parent $PSScriptRoot)
$previousCompiler = $env:WSD_MAKENSIS
$previousThumbprint = $env:WSD_SIGNING_THUMBPRINT
try {
    if ($PSBoundParameters.ContainsKey('SigningThumbprint')) {
        if (!$SigningThumbprint) { throw '코드 서명 인증서 지문을 지정하세요.' }
        $env:WSD_SIGNING_THUMBPRINT = $SigningThumbprint
    }
    if ($env:WSD_SIGNING_THUMBPRINT) { & (Join-Path $PSScriptRoot 'sign-windows.ps1') }
    $env:WSD_MAKENSIS = & (Join-Path $PSScriptRoot 'setup-nsis.ps1')
    & wails3 task package
    if ($LASTEXITCODE -ne 0) { throw 'Windows 설치 패키지를 만들지 못했습니다.' }
} finally {
    $env:WSD_MAKENSIS = $previousCompiler
    $env:WSD_SIGNING_THUMBPRINT = $previousThumbprint
    Pop-Location
}
