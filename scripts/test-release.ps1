$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
$testRoot = Join-Path $project ('.local\release-test-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $testRoot -Force | Out-Null
$manifestPath = Join-Path $testRoot 'verified.json'
$previousToken = $env:GH_TOKEN
$previousOutput = $env:GITHUB_OUTPUT
$env:GH_TOKEN = 'synthetic-release-test'
$env:GITHUB_OUTPUT = $null
$head = '343cb8f2ff232d8321de668fa56283f904124517'
$names = @(
    'WinScriptDoctor-0.1.1-windows-amd64-setup.exe','WinScriptDoctor-0.1.1-windows-amd64.zip',
    'WinScriptDoctor-0.1.1-darwin-amd64.zip','WinScriptDoctor-0.1.1-darwin-arm64.zip',
    'winscript-doctor_0.1.1_amd64.deb','WinScriptDoctor-0.1.1-linux-amd64.tar.gz',
    'winscript-doctor_0.1.1_arm64.deb','WinScriptDoctor-0.1.1-linux-arm64.tar.gz'
)
$id = 0
$assets = @($names | ForEach-Object { $_; "$_.sha256" } | ForEach-Object {
    $id++
    [pscustomobject]@{id=[long]$id;name=$_;size=[long]1;state='uploaded';digest=('sha256:' + ('a' * 64))}
})
$baseline = [pscustomobject]@{id=[long]42;tag_name='v0.1.1';target_commitish=$head;draft=$true;assets=$assets}
$manifest = [ordered]@{
    repository='chchlee/winscript-doctor';version='0.1.1';buildRunId=[long]41962772771
    head=$head;releaseId=[long]42;verifiedAt=[datetimeoffset]::UtcNow.ToString('o')
    assets=@($assets | Sort-Object name | ForEach-Object {
        [ordered]@{id=[long]$_.id;name=$_.name;size=[long]$_.size;digest=$_.digest}
    })
}
$wsdReleaseTest = @{mutations=0;release=$baseline;lastBody=$null}
function Invoke-RestMethod {
    param([string]$Uri, $Headers, [string]$Method, $ContentType, [string]$Body)
    if ($Method -eq 'Patch') {
        $wsdReleaseTest.mutations++
        $wsdReleaseTest.lastBody = $Body | ConvertFrom-Json
        return [pscustomobject]@{draft=$false;tag_name='v0.1.1';html_url='https://github.com/chchlee/winscript-doctor/releases/tag/v0.1.1'}
    }
    if ($Uri.EndsWith('/actions/runs/41962772771')) {
        return [pscustomobject]@{status='completed';conclusion='success';path='.github/workflows/desktop-build.yml';head_repository=@{full_name='chchlee/winscript-doctor'};head_sha=$head}
    }
    if ($Uri.EndsWith('/releases?per_page=100')) { return @($wsdReleaseTest.release) }
    if ($Uri.EndsWith('/releases/42')) { return $wsdReleaseTest.release }
    throw 'Unexpected network request in the release test.'
}
function Invoke-WebRequest { throw 'Artifact download was not expected for a verified-manifest test.' }
function Start-Process { throw 'Unsigned installer execution attempted.' }

function Save-Manifest {
    $manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $manifestPath -Encoding utf8
}
function Assert-Blocked([string]$message) {
    $wsdReleaseTest.mutations = 0
    $blocked = $false
    try {
        & (Join-Path $PSScriptRoot 'publish-release.ps1') -Version 0.1.1 -BuildRunId 41962772771 -VerifiedManifest $manifestPath -Publish | Out-Null
    } catch {
        if (!$_.Exception.Message.Contains($message)) { throw }
        $blocked = $true
    }
    if (!$blocked -or $wsdReleaseTest.mutations -ne 0) { throw 'Unsafe release request reached publication.' }
}
try {
    Save-Manifest
    & (Join-Path $PSScriptRoot 'publish-release.ps1') -Version 0.1.1 -BuildRunId 41962772771 -VerifiedManifest $manifestPath -Publish | Out-Null
    if ($wsdReleaseTest.mutations -ne 1 -or $wsdReleaseTest.lastBody.tag_name -ne 'v0.1.1' -or
        $wsdReleaseTest.lastBody.target_commitish -ne $head -or $wsdReleaseTest.lastBody.draft -ne $false) {
        throw 'Verified release did not publish the expected tag and source.'
    }

    $wsdReleaseTest.release.assets[0].digest = 'sha256:' + ('b' * 64)
    Assert-Blocked '검증 후 릴리스 파일'
    $wsdReleaseTest.release.assets[0].digest = 'sha256:' + ('a' * 64)
    $manifest.verifiedAt = [datetimeoffset]::UtcNow.AddHours(-3).ToString('o')
    Save-Manifest
    Assert-Blocked '만료'
    $manifest.verifiedAt = [datetimeoffset]::UtcNow.ToString('o')
    Save-Manifest

    $wsdReleaseTest.release.assets = @($assets | Where-Object name -NotMatch 'windows')
    Assert-Blocked '서명된 Windows'
    $wsdReleaseTest.release.assets = $assets
    $wsdReleaseTest.release.target_commitish = 'f' * 40
    Assert-Blocked '소스 커밋'
    $wsdReleaseTest.release.target_commitish = $head

    $wsdReleaseTest.release.draft = $false
    $wsdReleaseTest.mutations = 0
    & (Join-Path $PSScriptRoot 'publish-release.ps1') -Version 0.1.1 -BuildRunId 41962772771 -Publish | Out-Null
    if ($wsdReleaseTest.mutations -ne 0) { throw 'Published release was modified on retry.' }
    $wsdReleaseTest.release.draft = $true

    $unsigned = Join-Path $testRoot 'unsigned.exe'
    Set-Content -LiteralPath $unsigned -Value 'synthetic unsigned test file'
    $rejected = $false
    try {
        & (Join-Path $PSScriptRoot 'test-windows-installer.ps1') -Installer $unsigned -RequireSigned | Out-Null
    } catch {
        if (!$_.Exception.Message.Contains('신뢰된 서명')) { throw }
        $rejected = $true
    }
    if (!$rejected) { throw 'Unsigned installer was accepted.' }
    'Release gates passed for asset changes, expired checks, missing Windows files, source mismatch, retries and unsigned installers.'
} finally {
    $env:GH_TOKEN = $previousToken
    $env:GITHUB_OUTPUT = $previousOutput
    foreach ($file in @($manifestPath,(Join-Path $testRoot 'unsigned.exe'))) {
        if (Test-Path -LiteralPath $file) { Remove-Item -LiteralPath $file }
    }
    if (!(Get-ChildItem -LiteralPath $testRoot -Force)) { Remove-Item -LiteralPath $testRoot }
}
