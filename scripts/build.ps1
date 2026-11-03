. (Join-Path $PSScriptRoot 'tool-path.ps1')
Push-Location (Split-Path -Parent $PSScriptRoot)
try {
    & wails3 task build
    if ($LASTEXITCODE -ne 0) { throw 'Windows 앱 빌드에 실패했습니다.' }
    Get-Item -LiteralPath 'bin/WinScriptDoctor.exe' | Select-Object FullName, Length
} finally { Pop-Location }
