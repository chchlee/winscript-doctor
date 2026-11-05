param([Parameter(Mandatory)][string]$Installer, [string]$PreviousInstaller)
$ErrorActionPreference = 'Stop'
$exe = (Resolve-Path -LiteralPath $Installer).Path
$firstInstaller = if ($PreviousInstaller) { (Resolve-Path -LiteralPath $PreviousInstaller).Path } else { $exe }
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
    $result = Start-Process -FilePath $firstInstaller -ArgumentList '/S' -WindowStyle Hidden -Wait -PassThru
    if ($result.ExitCode -ne 0) { throw "설치 실패: $($result.ExitCode)" }
    $ownsInstall = $true
    $registered = Get-ItemProperty -LiteralPath $key
    if ($registered.InstallLocation -ne $root -or !(Test-Path -LiteralPath $menu)) {
        throw '설치 등록 또는 시작 메뉴가 올바르지 않습니다.'
    }
    Set-Content -LiteralPath $keep -Value 'preserve this file'
    if ($PreviousInstaller) {
        $oldHash = (Get-FileHash -LiteralPath $installed).Hash
        $locked = [IO.File]::Open($uninstaller, 'Open', 'Read', 'None')
        try {
            $blocked = Start-Process -FilePath $exe -ArgumentList '/S' -WindowStyle Hidden -Wait -PassThru
        } finally { $locked.Dispose() }
        if ($blocked.ExitCode -eq 0 -or (Get-FileHash -LiteralPath $installed).Hash -ne $oldHash -or
            (Get-ItemProperty -LiteralPath $key).DisplayVersion -ne $registered.DisplayVersion) {
            throw '업데이트 실패 후 기존 설치가 복원되지 않았습니다.'
        }
        $updated = Start-Process -FilePath $exe -ArgumentList '/S' -WindowStyle Hidden -Wait -PassThru
        if ($updated.ExitCode -ne 0 -or (Get-ItemProperty -LiteralPath $key).DisplayVersion -ne (Get-Item -LiteralPath $exe).VersionInfo.FileVersion -or
            (Get-Content -LiteralPath $keep) -ne 'preserve this file') {
            throw '기존 버전 업데이트 또는 사용자 파일 보존에 실패했습니다.'
        }
        '기존 버전 업데이트와 잠긴 파일로 인한 실패 시 복원을 확인했습니다.'
    }
    $source = Join-Path (Split-Path -Parent $PSScriptRoot) 'bin\WinScriptDoctor.exe'
    $setupSignature = Get-AuthenticodeSignature -LiteralPath $exe
    if ($setupSignature.Status -ne 'NotSigned') {
        if ($setupSignature.Status -ne 'Valid' -or !$setupSignature.TimeStamperCertificate) { throw '설치 프로그램 서명이 올바르지 않습니다.' }
        foreach ($binary in @($installed,$uninstaller)) {
            $signature = Get-AuthenticodeSignature -LiteralPath $binary
            if ($signature.Status -ne 'Valid' -or !$signature.TimeStamperCertificate -or $signature.SignerCertificate.Thumbprint -ne $setupSignature.SignerCertificate.Thumbprint) {
                throw '설치된 실행 파일의 서명 또는 타임스탬프가 올바르지 않습니다.'
            }
        }
    } elseif ((Get-FileHash -LiteralPath $source).Hash -ne (Get-FileHash -LiteralPath $installed).Hash) {
        throw '설치된 실행 파일이 빌드 결과와 다릅니다.'
    }
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
