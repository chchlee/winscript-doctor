# 운영체제별 설치와 빌드

Windows·macOS·Linux에서 스크립트 파일 수집, 스냅샷 가져오기·저장과 환경 비교를 사용할 수 있습니다. 예약 작업 조회와 SMB 공유 검사는 Windows 앱에서 제공합니다.

## 대상과 파일

배포 파일은 [GitHub Releases](https://github.com/chchlee/winscript-doctor/releases)에서 확인하세요. 개발 빌드에서는 동일한 이름을 `bin/packages`에 생성합니다. 각 파일 옆에 SHA-256 체크섬이 있습니다.

| 대상                             | 파일 이름                                                                               | 설치 방식                               |
| -------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------- |
| Windows 10/11 x64                | `WinScriptDoctor-0.1.0-windows-amd64-setup.exe`                                         | 현재 사용자 계정에 설치                 |
| Windows 10/11 x64                | `WinScriptDoctor-0.1.0-windows-amd64.zip`                                               | 압축을 풀고 실행                        |
| macOS 14+ Apple Silicon          | `WinScriptDoctor-0.1.0-darwin-arm64.zip`                                                | 압축을 풀고 .app을 응용 프로그램에 복사 |
| macOS 14+ Intel                  | `WinScriptDoctor-0.1.0-darwin-amd64.zip`                                                | 압축을 풀고 .app을 응용 프로그램에 복사 |
| Ubuntu 24.04+ / Debian 13+ x64   | `winscript-doctor_0.1.0_amd64.deb`                                                      | apt로 설치                              |
| Ubuntu 24.04+ / Debian 13+ ARM64 | `winscript-doctor_0.1.0_arm64.deb`                                                      | apt로 설치                              |
| Linux x64 / ARM64                | `WinScriptDoctor-0.1.0-linux-amd64.tar.gz` / `WinScriptDoctor-0.1.0-linux-arm64.tar.gz` | 압축 해제 후 사용자 설치                |

Linux는 GTK4와 WebKitGTK 6.0이 필요합니다. Wails 3.1에서 GTK3 경로는 사용하지 않습니다. macOS는 OS에 포함된 WKWebView를 사용하며, Tailwind 4의 현대적인 WebKit 요구사항을 고려해 최소 대상을 macOS 14로 정했습니다. [Wails 설치 요구사항](https://wails.io/quick-start/installation/), [Tailwind 호환성](https://tailwindcss.com/docs/compatibility)

최종 사용자는 Go·Node를 설치할 필요가 없습니다. Linux의 공유 런타임과 Windows의 WebView2 추가 설치 용량은 앱 파일 크기와 별개입니다.

## Windows 설치

Setup.exe를 실행하면 관리자 권한 없이 `%LOCALAPPDATA%\Programs\WinScript Doctor`에 설치되고 시작 메뉴에 등록됩니다. **설정 → 앱 → 설치된 앱**에서 제거할 수 있습니다. 제거해도 저장한 스냅샷과 앱 사용자 데이터는 보존합니다. 공개 v0.1.0 Windows 설치 프로그램에는 코드 서명이 없습니다.

v0.1.1부터는 설치 완료 화면에서 **WinScript Doctor 실행**을 선택할 수 있습니다. 새 Setup.exe는 이전 버전이 같은 위치에 등록되어 있으면 프로그램 파일을 업데이트합니다. 업데이트 전에 열린 결과를 저장하고 앱을 닫으세요.

v0.1.1 데스크톱 앱은 시작 시 GitHub 릴리스의 버전을 조회합니다. 새 버전이 있으면 OS와 CPU에 맞는 파일을 브라우저에서 받을 수 있습니다. **이 버전 다시 보지 않기**를 선택하면 해당 버전의 시작 알림을 숨깁니다. 상단의 **업데이트 확인** 버튼으로 수동 확인할 수 있습니다.

설치가 필요 없으면 ZIP을 풀고 WinScriptDoctor.exe를 실행합니다. 두 방식 모두 [Microsoft WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/)이 필요합니다.

실제 파일을 점검하려면 **로컬 수집 → 폴더 선택 후 수집**을 사용합니다. 읽기 전용으로 해시와 예약 작업 참조를 수집하고 부분 실패를 표시합니다. 저장된 Windows 결과는 Mac·Linux에서도 열 수 있습니다. 자세한 [수집 범위](collection.md)를 확인하세요.

## macOS 설치

자신의 CPU에 맞는 darwin-arm64 또는 darwin-amd64 ZIP을 압축 해제합니다. 포함된 WinScript Doctor.app을 Applications 또는 사용자 홈의 Applications 폴더로 복사합니다. 같은 이름의 기존 앱은 Finder의 교체 확인을 거쳐 직접 관리합니다.

빌드 스크립트는 로컬 실행용 ad-hoc 서명을 적용하고 검증합니다. 공개 배포용 Developer ID 서명·Apple 공증은 포함하지 않았습니다. 인터넷에서 내려받은 미공증 앱은 Gatekeeper가 실행을 제한할 수 있으므로, 배포 전 정식 서명과 공증 검증이 필요합니다. [Wails macOS 패키징](https://wails.io/guides/build/macos/)

## Linux 설치

Ubuntu·Debian 계열에서는 생성된 패키지를 설치합니다.

```sh
sudo apt install ./winscript-doctor_0.1.0_amd64.deb
```

ARM64에서는 파일 이름의 amd64를 arm64로 바꿉니다. tar.gz는 압축을 해제한 폴더에서 현재 사용자 계정으로 설치합니다.

```sh
sh ./install.sh
```

실행 파일은 ~/.local/bin/winscript-doctor에, 앱 메뉴와 아이콘은 XDG_DATA_HOME 또는 ~/.local/share 아래에 설치합니다. shell 프로필을 수정하거나 sudo를 사용하지 않습니다. 같은 이름의 알 수 없는 파일과 충돌하면 설치를 중단합니다. GTK4·WebKitGTK 6.0을 제공하는 다른 배포판에서도 tar.gz를 사용할 수 있으나, 배포판별 실행 검증이 필요합니다.

삭제는 Debian 패키지라면 패키지 관리자로 수행합니다. 사용자 설치라면 설치한 ~/.local/bin/winscript-doctor, 앱 메뉴 항목과 아이콘만 제거합니다. 저장한 스냅샷과 앱 사용자 데이터는 자동으로 지우지 않습니다.

## 소스에서 빌드

각 대상 운영체제의 네이티브 환경에서 빌드합니다. Go 1.27.3, Node 24, Wails CLI 3.1.0이 필요합니다.

```sh
go install github.com/wailsapp/wails/v3/cmd/wails3@v3.1.0
export PATH="$(go env GOPATH)/bin:$PATH"
cd frontend
npm ci
cd ..
sh scripts/package.sh
```

macOS에는 Xcode Command Line Tools가 필요합니다. Linux 빌드의 개발 라이브러리는 Ubuntu 24.04 기준 다음과 같습니다.

```sh
sudo apt update
sudo apt install build-essential pkg-config libgtk-4-dev libwebkitgtk-6.0-dev
```

결과는 bin/packages에 저장되고 SHA256 파일이 함께 생성됩니다. macOS 개발 실행은 .app 번들을 구성한 뒤 실행하므로 앱 메뉴·키보드 동작의 기본 번들 식별자를 유지합니다.

```sh
# 개발 실행
sh scripts/dev.sh

# 테스트할 Chromium 준비 후 테스트
cd frontend
node node_modules/@playwright/test/cli.js install chromium
cd ..
sh scripts/test.sh
```

Windows에서는 기존 scripts/build.ps1, scripts/dev.ps1, scripts/test.ps1을 사용할 수 있습니다. Setup.exe와 포터블 ZIP을 모두 만들려면 PowerShell에서 `.\scripts\package.ps1`을 실행하세요. 빌드 도구 NSIS는 프로젝트의 .local에 내려받으며 시스템에 설치하지 않습니다.

서명 패키지를 만들려면 PowerShell 7, Windows SDK SignTool과 Windows 개인 인증서 저장소에 연결된 공개 신뢰 코드 서명 인증서가 필요합니다. `.\scripts\package.ps1 -SigningThumbprint <인증서 지문>`으로 앱, 제거 프로그램, Setup.exe에 SHA-256 서명과 타임스탬프를 적용합니다. 서명을 확인한 파일과 체크섬은 `bin/signed-packages`에 생성됩니다. [SignTool 안내](https://learn.microsoft.com/en-us/windows/win32/seccrypto/signtool)

서명된 Windows 패키지까지 릴리스 초안에 첨부하면 Publish signed desktop release 워크플로로 전체 검증과 공개를 실행할 수 있습니다. [릴리스 절차](releasing.md)

## 네이티브 빌드 자동화

.github/workflows/desktop-build.yml은 Windows x64, Ubuntu x64·ARM64, Apple Silicon Mac, Intel Mac에서 네이티브 빌드와 패키지를 생성합니다. 수동 실행 또는 기본 브랜치에서 해당 워크플로 파일을 변경할 때 실행합니다. 결과는 빌드 아티팩트로 업로드합니다. 공개 릴리스는 검증 후 별도로 게시합니다.

[v0.1.0 프리뷰](https://github.com/chchlee/winscript-doctor/releases/tag/v0.1.0)에는 설치 파일 8종과 각각의 SHA-256 파일이 있습니다. Windows 11에서 설치·중복 설치 차단·제거와 사용자 파일 보존, Ubuntu 24.04 x64·ARM64에서 .deb 설치와 공유 라이브러리, Mac 두 CPU에서 .app 번들·서명·CPU 유형을 검증했습니다. 자세한 내용은 [배포 검증 기록](release-verification.md)을 참고하세요.
