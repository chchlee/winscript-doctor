$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$tools = Join-Path $repo '.local\nsis-tools'
$archive = Join-Path $tools 'nsis-3.13.zip'
$compiler = Join-Path $tools 'nsis-3.13\makensis.exe'
$expected = 'BA63DFFC4410EE89193E1CB5A41989991BD77C61068DA17E3156D136B7B0B3D8'
New-Item -ItemType Directory -Path $tools -Force | Out-Null
if (!(Test-Path -LiteralPath $archive)) {
    $download = $archive + '.download'
    & curl.exe --fail --location --silent --show-error --retry 2 --max-time 90 'https://downloads.sourceforge.net/project/nsis/NSIS%203/3.13/nsis-3.13.zip' -o $download
    if ($LASTEXITCODE -ne 0 -or (Get-FileHash -LiteralPath $download).Hash -ne $expected) {
        throw 'NSIS 다운로드 또는 체크섬 확인에 실패했습니다.'
    }
    Move-Item -LiteralPath $download -Destination $archive
}
if ((Get-FileHash -LiteralPath $archive).Hash -ne $expected) { throw 'NSIS 체크섬이 일치하지 않습니다.' }
if (!(Test-Path -LiteralPath $compiler)) {
    Expand-Archive -LiteralPath $archive -DestinationPath $tools -Force
}
if (!(Test-Path -LiteralPath $compiler)) { throw 'NSIS 컴파일러를 찾지 못했습니다.' }
$compiler
