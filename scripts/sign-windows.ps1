param([string]$Target)
$ErrorActionPreference = 'Stop'
$thumbprint = $env:WSD_SIGNING_THUMBPRINT
if ($thumbprint -notmatch '^[a-fA-F0-9]{40}$') {
    throw 'Set WSD_SIGNING_THUMBPRINT to the code-signing certificate thumbprint.'
}

$cert = $null
$machineStore = $false
foreach ($store in @('CurrentUser', 'LocalMachine')) {
    $candidate = Get-Item -LiteralPath "Cert:\$store\My\$thumbprint" -ErrorAction SilentlyContinue
    if ($candidate -and $candidate.HasPrivateKey) {
        $cert = $candidate
        $machineStore = $store -eq 'LocalMachine'
        break
    }
}
if (!$cert) { throw 'The code-signing certificate and private key are unavailable.' }
$now = Get-Date
$usage = $cert.Extensions | Where-Object { $_ -is [Security.Cryptography.X509Certificates.X509EnhancedKeyUsageExtension] }
if ($cert.Subject -eq $cert.Issuer -or $cert.NotBefore -gt $now -or $cert.NotAfter -lt $now -or
    '1.3.6.1.5.5.7.3.3' -notin $usage.EnhancedKeyUsages.Value) {
    throw 'A current code-signing certificate issued by a trusted CA is required.'
}

$tool = $env:WSD_SIGNTOOL
if (!$tool) {
    $command = Get-Command signtool.exe -CommandType Application -ErrorAction SilentlyContinue
    if ($command) { $tool = $command.Source }
}
if (!$tool) {
    $kits = Join-Path ${env:ProgramFiles(x86)} 'Windows Kits\10\bin'
    $versionedKits = Get-ChildItem -LiteralPath $kits -Directory -ErrorAction SilentlyContinue |
        Where-Object Name -Match '^\d+\.\d+\.\d+\.\d+$' |
        Sort-Object { [version]$_.Name } -Descending
    foreach ($kit in $versionedKits) {
        $candidate = Join-Path $kit.FullName 'x64\signtool.exe'
        if (Test-Path -LiteralPath $candidate -PathType Leaf) { $tool = $candidate; break }
    }
}
if (!$tool -or !(Test-Path -LiteralPath $tool -PathType Leaf)) {
    throw 'Install Windows SDK SignTool or set WSD_SIGNTOOL to its full path.'
}
if (!$Target) { return }

$file = (Resolve-Path -LiteralPath $Target).Path
$signArgs = @('sign', '/sha1', $thumbprint, '/fd', 'SHA256', '/tr', 'http://timestamp.digicert.com', '/td', 'SHA256')
if ($machineStore) { $signArgs += '/sm' }
& $tool @signArgs $file
if ($LASTEXITCODE -ne 0) { throw 'Authenticode signing or timestamping failed.' }
& $tool verify /pa /tw $file
if ($LASTEXITCODE -ne 0) { throw 'Authenticode verification failed.' }
$signature = Get-AuthenticodeSignature -LiteralPath $file
if ($signature.Status -ne 'Valid' -or !$signature.TimeStamperCertificate -or $signature.SignerCertificate.Thumbprint -ne $thumbprint) {
    throw 'The expected trusted, timestamped signature is missing.'
}
