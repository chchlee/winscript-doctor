. (Join-Path $PSScriptRoot 'tool-path.ps1')
Push-Location (Split-Path -Parent $PSScriptRoot)
try {
    & npm --prefix frontend run build
    if ($LASTEXITCODE -ne 0) { throw '테스트용 프런트엔드 빌드가 실패했습니다.' }
    & go test ./...
    if ($LASTEXITCODE -ne 0) { throw 'Go 테스트가 실패했습니다.' }
    & node --test scripts/desktop.test.mjs
    if ($LASTEXITCODE -ne 0) { throw '설치 패키지 테스트가 실패했습니다.' }
    & npm --prefix frontend test
    if ($LASTEXITCODE -ne 0) { throw '프런트엔드 테스트가 실패했습니다.' }
    Push-Location frontend
    try {
        & node node_modules/@playwright/test/cli.js test
        if ($LASTEXITCODE -ne 0) { throw '화면 동작 테스트가 실패했습니다.' }
    } finally { Pop-Location }
} finally { Pop-Location }
