# 운영체제별 설치와 빌드

WinScript Doctor의 GUI, 스냅샷 가져오기·저장과 Windows 실행 환경 비교를 Windows·macOS·Linux에서 사용할 수 있게 빌드 경로를 구성했습니다. Linux와 macOS에서 BAT를 실행하거나 Windows 작업 스케줄러를 직접 조회하는 기능은 포함하지 않습니다.

## 대상과 패키지

| 운영체제 | 대상                             | 생성할 설치 파일  | 현재 확인 범위                                               |
| -------- | -------------------------------- | ----------------- | ------------------------------------------------------------ |
| Windows  | amd64                            | 포터블 ZIP        | 현재 PC에서 빌드·실행 확인                                   |
| macOS    | 14 이상 Apple Silicon·Intel      | .app이 포함된 ZIP | 번들 구조·네이티브 연결 코드 검증, 실제 Mac 빌드·설치 미확인 |
| Linux    | Ubuntu 24.04 이상·Debian 13 이상 | .deb 및 tar.gz    | 패키지 구조·네이티브 연결 코드 검증, Linux 빌드·설치 미확인  |

Linux는 GTK4와 WebKitGTK 6.0이 필요합니다. Wails 3.1에서 GTK3 경로는 사용하지 않습니다. macOS는 OS에 포함된 WKWebView를 사용하며, Tailwind 4의 현대적인 WebKit 요구사항을 고려해 최소 대상을 macOS 14로 정했습니다. [Wails 설치 요구사항](https://wails.io/quick-start/installation/), [Tailwind 호환성](https://tailwindcss.com/docs/compatibility)

최종 사용자는 Go·Node를 설치할 필요가 없습니다. Linux의 공유 런타임과 Windows의 WebView2 추가 설치 용량은 앱 파일 크기와 별개입니다.

## Windows 설치

ZIP을 압축 해제하고 WinScriptDoctor.exe를 실행합니다. WebView2 Runtime이 필요합니다. 설치된 앱·예약 작업·PowerShell 정책을 자동 변경하지 않습니다.

## macOS 설치

자신의 CPU에 맞는 darwin-arm64 또는 darwin-amd64 ZIP을 압축 해제합니다. 포함된 WinScript Doctor.app을 Applications 또는 사용자 홈의 Applications 폴더로 복사하고 실행합니다. 같은 이름의 기존 앱은 Finder의 교체 확인을 거쳐 직접 관리합니다.

빌드 스크립트는 로컬 실행용 ad-hoc 서명을 적용하고 검증합니다. 공개 배포용 Developer ID 서명·Apple 공증은 포함하지 않았습니다. 인터넷에서 내려받은 미공증 앱은 Gatekeeper가 실행을 제한할 수 있으므로, 배포 전 정식 서명과 공증 검증이 필요합니다. [Wails macOS 패키징](https://wails.io/guides/build/macos/)

## Linux 설치

Ubuntu·Debian 계열에서는 생성된 패키지를 설치합니다.

```sh
sudo apt install ./winscript-doctor_0.1.0_amd64.deb
```

tar.gz는 압축을 해제한 폴더에서 현재 사용자 계정으로 설치합니다.

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

Windows에서는 기존 scripts/build.ps1, scripts/dev.ps1, scripts/test.ps1을 사용할 수 있습니다. 설치 ZIP까지 만들려면 wails3 task package를 실행합니다.

## 네이티브 빌드 자동화

.github/workflows/desktop-build.yml은 Windows, Ubuntu, Apple Silicon Mac, Intel Mac을 각각 해당 운영체제에서 빌드·테스트·패키징하도록 구성합니다. 수동 실행 전용이며 자동 배포·Release 게시·푸시를 하지 않습니다. 저장소 공개나 커밋 푸시만으로 실행되지 않으며, 현재 검증 결과에는 GitHub Actions 실행 결과가 포함되지 않습니다.

Mac·Linux의 실제 설치와 GUI 확인이 끝나기 전에는 설치 검증 완료로 표시하지 않습니다.
