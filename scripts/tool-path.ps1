$ErrorActionPreference = 'Stop'

# Session-local fallback for the tools prepared on this PC. No global settings
# or registry entries are changed; normal Go/Node/Wails installations also work.
$toolRoot = Join-Path $env:LOCALAPPDATA 'WinScriptDoctor\Toolchains'
$candidates = @((Join-Path $toolRoot 'go\bin'), (Join-Path $toolRoot 'bin'))
foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) { $env:PATH = $candidate + ';' + $env:PATH }
}
foreach ($tool in @('go', 'node', 'npm', 'wails3')) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        throw "필수 개발 도구를 찾지 못했습니다: $tool. README의 개발 환경을 확인하세요."
    }
}
