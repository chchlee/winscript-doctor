param(
    [Parameter(Mandatory)][ValidatePattern('^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$')][string]$Version,
    [Parameter(Mandatory)][ValidateRange(1, [long]::MaxValue)][long]$BuildRunId,
    [string]$VerifiedManifest,
    [switch]$Publish
)
$ErrorActionPreference = 'Stop'
$repo = 'chchlee/winscript-doctor'
$api = "https://api.github.com/repos/$repo"
$tag = "v$Version"
$headers = @{Accept='application/vnd.github+json'; 'User-Agent'='WinScriptDoctor-release'; 'X-GitHub-Api-Version'='2026-03-10'}
$root = Split-Path -Parent $PSScriptRoot
$work = Join-Path $root ('.local\release-check-' + [guid]::NewGuid().ToString('N'))
$expected = @(
    "WinScriptDoctor-$Version-windows-amd64-setup.exe"
    "WinScriptDoctor-$Version-windows-amd64.zip"
    "WinScriptDoctor-$Version-darwin-amd64.zip"
    "WinScriptDoctor-$Version-darwin-arm64.zip"
    "winscript-doctor_$($Version)_amd64.deb"
    "WinScriptDoctor-$Version-linux-amd64.tar.gz"
    "winscript-doctor_$($Version)_arm64.deb"
    "WinScriptDoctor-$Version-linux-arm64.tar.gz"
)
$expectedFiles = @($expected | ForEach-Object { $_; "$_.sha256" })

function Assert-AssetList($release) {
    $names = @($release.assets.name | Sort-Object)
    if ($names.Count -ne 16 -or @($names | Select-Object -Unique).Count -ne 16 -or
        (Compare-Object ($expectedFiles | Sort-Object) $names)) {
        throw '서명된 Windows Setup/ZIP을 포함한 설치 파일 8개와 체크섬 8개가 초안에 필요합니다.'
    }
    foreach ($asset in $release.assets) {
        if ($asset.state -ne 'uploaded' -or $asset.digest -notmatch '^sha256:[a-f0-9]{64}$' -or
            $asset.size -le 0 -or $asset.size -gt 200MB) {
            throw "릴리스 파일 상태 또는 SHA-256을 확인하지 못했습니다. $($asset.name)"
        }
    }
}

function Get-AssetRecords($release) {
    @($release.assets | Sort-Object name | ForEach-Object {
        [ordered]@{id=[long]$_.id;name=$_.name;size=[long]$_.size;digest=$_.digest}
    })
}

function Download-Verified([string]$uri, [string]$path, [string]$digest, [switch]$ReleaseAsset) {
    $downloadHeaders = $headers.Clone()
    if ($ReleaseAsset) { $downloadHeaders.Accept = 'application/octet-stream' }
    try {
        Invoke-WebRequest -Uri $uri -Headers $downloadHeaders -OutFile $path
    } catch {
        throw 'GitHub 검증 파일을 다운로드하지 못했습니다.'
    } finally {
        $downloadHeaders.Remove('Authorization')
    }
    if (('sha256:' + (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()) -ne $digest) {
        throw "다운로드 SHA-256이 다릅니다. $(Split-Path -Leaf $path)"
    }
}

function Assert-Signature([string]$path, [string]$thumbprint) {
    $signature = Get-AuthenticodeSignature -LiteralPath $path
    $info = (Get-Item -LiteralPath $path).VersionInfo
    if ($signature.Status -ne 'Valid' -or !$signature.TimeStamperCertificate -or
        ($thumbprint -and $signature.SignerCertificate.Thumbprint -ne $thumbprint) -or
        $info.ProductName -ne 'WinScript Doctor' -or $info.FileVersion -ne $Version) {
        throw 'Windows 파일의 신뢰된 서명, 타임스탬프 또는 제품 정보를 확인하지 못했습니다.'
    }
    return $signature.SignerCertificate.Thumbprint
}

$credential = $null
$line = $null
if ($env:GH_TOKEN) {
    $headers.Authorization = 'Bearer ' + $env:GH_TOKEN
} else {
    $credential = (@('protocol=https','host=github.com','username=chchlee','') -join [Environment]::NewLine) |
        git -c credential.interactive=never credential fill
    $line = $credential | Where-Object { $_ -like 'password=*' } | Select-Object -First 1
    if (!$line) { throw 'GitHub 인증이 필요합니다.' }
    $headers.Authorization = 'Bearer ' + $line.Substring(9)
}
try {
    $run = Invoke-RestMethod "$api/actions/runs/$BuildRunId" -Headers $headers
    if ($run.status -ne 'completed' -or $run.conclusion -ne 'success' -or
        $run.path -ne '.github/workflows/desktop-build.yml' -or
        $run.head_repository.full_name -ne $repo -or $run.head_sha -notmatch '^[a-f0-9]{40}$') {
        throw '이 저장소에서 성공한 네이티브 데스크톱 빌드를 지정하세요.'
    }
    $releases = @(Invoke-RestMethod "$api/releases?per_page=100" -Headers $headers)
    $matchingReleases = @($releases | ForEach-Object { $_ } | Where-Object tag_name -eq $tag)
    if ($matchingReleases.Count -ne 1) { throw '검증할 릴리스 초안 한 개가 필요합니다.' }
    $release = $matchingReleases[0]
    if (!$release.draft) {
        if ($release.target_commitish -ne $run.head_sha) { throw '공개 릴리스의 소스 커밋이 다릅니다.' }
        Assert-AssetList $release
        if ($env:GITHUB_OUTPUT) { 'published=true' | Add-Content -LiteralPath $env:GITHUB_OUTPUT }
        "이미 공개된 릴리스입니다. $($release.html_url)"
        return
    }
    if ($release.target_commitish -ne $run.head_sha) { throw '릴리스 초안과 빌드 소스 커밋이 다릅니다.' }
    Assert-AssetList $release

    if ($VerifiedManifest) {
        if (!$Publish) { throw '검증 기록은 공개 단계에서 사용합니다.' }
        $manifest = Get-Content -LiteralPath $VerifiedManifest -Raw | ConvertFrom-Json
        $age = [datetimeoffset]::UtcNow - [datetimeoffset]::Parse($manifest.verifiedAt)
        if ($manifest.repository -ne $repo -or $manifest.version -ne $Version -or
            $manifest.buildRunId -ne $BuildRunId -or $manifest.head -ne $run.head_sha -or
            $manifest.releaseId -ne $release.id -or $age.TotalMinutes -lt 0 -or $age.TotalHours -gt 2 -or
            (ConvertTo-Json -InputObject (Get-AssetRecords $release) -Compress) -ne
            (ConvertTo-Json -InputObject $manifest.assets -Compress)) {
            throw '검증 후 릴리스 파일이 바뀌었거나 검증 기록이 만료됐습니다.'
        }
    } else {
        New-Item -ItemType Directory -Path $work -Force | Out-Null
        foreach ($asset in $release.assets) {
            Download-Verified "$api/releases/assets/$($asset.id)" (Join-Path $work $asset.name) $asset.digest -ReleaseAsset
        }
        foreach ($name in $expected) {
            $hash = (Get-FileHash -LiteralPath (Join-Path $work $name)).Hash.ToLowerInvariant()
            if ((Get-Content -LiteralPath (Join-Path $work "$name.sha256") -Raw).Trim() -ne "$hash  $name") {
                throw "파일 체크섬이 다릅니다. $name"
            }
        }
        $jobs = (Invoke-RestMethod "$api/actions/runs/$BuildRunId/jobs?per_page=100" -Headers $headers).jobs
        $artifacts = (Invoke-RestMethod "$api/actions/runs/$BuildRunId/artifacts?per_page=100" -Headers $headers).artifacts
        foreach ($target in @('darwin-amd64','darwin-arm64','linux-amd64','linux-arm64')) {
            $job = @($jobs | Where-Object name -eq $target)
            $check = if ($target.StartsWith('darwin-')) { 'Verify packaged macOS app' } else { 'Verify Linux package installation' }
            if ($job.Count -ne 1 -or $job[0].conclusion -ne 'success' -or
                !($job[0].steps | Where-Object { $_.name -eq $check -and $_.conclusion -eq 'success' })) {
                throw "네이티브 설치 검증이 끝나지 않았습니다. $target"
            }
            $artifact = @($artifacts | Where-Object { $_.name -eq "WinScriptDoctor-$target" -and !$_.expired })
            if ($artifact.Count -ne 1 -or $artifact[0].workflow_run.head_sha -ne $run.head_sha -or
                $artifact[0].digest -notmatch '^sha256:[a-f0-9]{64}$') {
                throw "동일 소스의 빌드 아티팩트가 필요합니다. $target"
            }
            $zip = Join-Path $work "$target.zip"
            Download-Verified "$api/actions/artifacts/$($artifact[0].id)/zip" $zip $artifact[0].digest
            $archive = [IO.Compression.ZipFile]::OpenRead($zip)
            try {
                $names = @($expected | Where-Object { $_ -like "*$target*" -or
                    ($target -eq 'linux-amd64' -and $_ -eq "winscript-doctor_$($Version)_amd64.deb") -or
                    ($target -eq 'linux-arm64' -and $_ -eq "winscript-doctor_$($Version)_arm64.deb") } |
                    ForEach-Object { $_; "$_.sha256" })
                if ($archive.Entries.Count -ne $names.Count) { throw '빌드 아티팩트의 파일 수가 다릅니다.' }
                foreach ($name in $names) {
                    $entry = $archive.GetEntry($name)
                    if (!$entry -or $entry.Length -le 0 -or $entry.Length -gt 200MB) { throw '빌드 아티팩트 항목이 잘못됐습니다.' }
                    $source = Join-Path $work "original-$name"
                    [IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $source, $false)
                    if ((Get-FileHash -LiteralPath $source).Hash -ne (Get-FileHash -LiteralPath (Join-Path $work $name)).Hash) {
                        throw "빌드 결과와 릴리스 파일이 다릅니다. $name"
                    }
                }
            } finally { $archive.Dispose() }
        }
        $setup = Join-Path $work "WinScriptDoctor-$Version-windows-amd64-setup.exe"
        $thumbprint = Assert-Signature $setup
        $portable = [IO.Compression.ZipFile]::OpenRead((Join-Path $work "WinScriptDoctor-$Version-windows-amd64.zip"))
        try {
            $entry = $portable.GetEntry("WinScriptDoctor-$Version-windows-amd64/WinScriptDoctor.exe")
            if (!$entry -or $entry.Length -le 0 -or $entry.Length -gt 200MB) { throw '포터블 앱을 찾지 못했습니다.' }
            $application = Join-Path $work 'WinScriptDoctor.exe'
            [IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $application, $false)
        } finally { $portable.Dispose() }
        [void](Assert-Signature $application $thumbprint)
        & (Join-Path $PSScriptRoot 'test-windows-installer.ps1') -Installer $setup -RequireSigned -ExpectedApplication $application
        $manifest = [ordered]@{
            repository=$repo;version=$Version;buildRunId=$BuildRunId;head=$run.head_sha
            releaseId=[long]$release.id;verifiedAt=[datetimeoffset]::UtcNow.ToString('o')
            assets=(Get-AssetRecords $release)
        }
        $manifestPath = Join-Path $work 'verified-release.json'
        $manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $manifestPath -Encoding utf8
        if ($env:GITHUB_OUTPUT) { "manifest=$manifestPath" | Add-Content -LiteralPath $env:GITHUB_OUTPUT }
        "릴리스 검증 기록을 저장했습니다. $manifestPath"
    }

    if ($Publish) {
        $current = Invoke-RestMethod "$api/releases/$($release.id)" -Headers $headers
        if (!$current.draft -or $current.target_commitish -ne $run.head_sha -or $current.tag_name -ne $tag -or
            (ConvertTo-Json -InputObject (Get-AssetRecords $current) -Compress) -ne
            (ConvertTo-Json -InputObject $manifest.assets -Compress)) {
            throw '공개 직전 릴리스 상태가 달라졌습니다.'
        }
        $body = @{tag_name=$tag;target_commitish=$run.head_sha;draft=$false;prerelease=$false;make_latest='true'} | ConvertTo-Json -Compress
        $published = Invoke-RestMethod "$api/releases/$($release.id)" -Method Patch -Headers $headers -ContentType 'application/json' -Body $body
        if ($published.draft -or $published.tag_name -ne $tag) { throw '릴리스 공개 상태를 확인하지 못했습니다.' }
        "릴리스를 공개했습니다. $($published.html_url)"
    }
} finally {
    $headers.Remove('Authorization')
    $credential = $null
    $line = $null
}
