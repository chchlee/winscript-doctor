param([Parameter(Mandatory)][string]$Installer)
$ErrorActionPreference = 'Stop'
$exe = (Resolve-Path -LiteralPath $Installer).Path
$root = Join-Path $env:LOCALAPPDATA 'Programs\WinScript Doctor'
$key = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\dev.winscriptdoctor.desktop'
$menu = Join-Path ([Environment]::GetFolderPath('Programs')) 'WinScript Doctor.lnk'
$installed = Join-Path $root 'WinScriptDoctor.exe'
$uninstaller = Join-Path $root 'Uninstall.exe'
$keep = Join-Path $root 'wsd-smoke-keep.txt'
if ((Test-Path -LiteralPath $root) -or (Test-Path -LiteralPath $key) -or (Test-Path -LiteralPath $menu)) {
    throw '기존 설치를 보존하기 위해 설치 테스트를 중단합니다.'
}
$ownsInstall = $false
try {
    $result = Start-Process -FilePath $exe -ArgumentList '/S' -WindowStyle Hidden -Wait -PassThru
    if ($result.ExitCode -ne 0) { throw "설치 실패: $($result.ExitCode)" }
    $ownsInstall = $true
    $registered = Get-ItemProperty -LiteralPath $key
    if ($registered.InstallLocation -ne $root -or !(Test-Path -LiteralPath $menu)) {
        throw '설치 등록 또는 시작 메뉴가 올바르지 않습니다.'
    }
    $source = Join-Path (Split-Path -Parent $PSScriptRoot) 'bin\WinScriptDoctor.exe'
    if ((Get-FileHash -LiteralPath $source).Hash -ne (Get-FileHash -LiteralPath $installed).Hash) {
        throw '설치된 실행 파일이 빌드 결과와 다릅니다.'
    }
    Set-Content -LiteralPath $keep -Value 'preserve this file'
    $duplicate = Start-Process -FilePath $exe -ArgumentList '/S' -WindowStyle Hidden -Wait -PassThru
    if ($duplicate.ExitCode -eq 0) { throw '기존 설치가 있는 위치에 덮어썼습니다.' }
} finally {
    if ($ownsInstall -and (Test-Path -LiteralPath $uninstaller)) {
        $result = Start-Process -FilePath $uninstaller -ArgumentList '/S' -WindowStyle Hidden -Wait -PassThru
        if ($result.ExitCode -ne 0 -or (Test-Path -LiteralPath $installed) -or (Test-Path -LiteralPath $key) -or (Test-Path -LiteralPath $menu)) {
            throw '앱 제거가 정상적으로 완료되지 않았습니다.'
        }
    }
}
if ((Get-Content -LiteralPath $keep) -ne 'preserve this file') { throw '앱 제거가 사용자 파일을 보존하지 않았습니다.' }
Remove-Item -LiteralPath $keep
if (!(Get-ChildItem -LiteralPath $root -Force)) { Remove-Item -LiteralPath $root }
'설치, 시작 메뉴, 중복 설치 차단, 제거 및 사용자 파일 보존을 확인했습니다.'
