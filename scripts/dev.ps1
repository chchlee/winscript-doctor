. (Join-Path $PSScriptRoot 'tool-path.ps1')
Push-Location (Split-Path -Parent $PSScriptRoot)
try {
    & wails3 dev -config ./build/config.yml -port 5173
    if ($LASTEXITCODE -ne 0) { throw '개발 앱 실행에 실패했습니다.' }
} finally { Pop-Location }
