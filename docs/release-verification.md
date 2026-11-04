# v0.1.0 데스크톱 배포 검증

2026-11-04에 [v0.1.0 프리뷰](https://github.com/chchlee/winscript-doctor/releases/tag/v0.1.0)를 게시했습니다. 태그는 배포 빌드의 소스 커밋 8a06d7b를 가리킵니다.

| 플랫폼                    | 검증                                                                                                                                   |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Windows x64               | 현재 Windows 11에서 Setup.exe 설치, 실행 파일 해시, 시작 메뉴·제거 등록, 중복 설치 차단, 앱 제거와 사용자 파일 보존을 확인했습니다.    |
| macOS Apple Silicon·Intel | 각 네이티브 러너에서 빌드한 ZIP을 풀고 .app의 ad-hoc 서명과 CPU 유형을 확인했습니다.                                                   |
| Linux x64·ARM64           | Ubuntu 24.04의 각 네이티브 러너에 .deb를 설치하고 설치된 실행 파일이 빌드 결과와 같은지, 필요한 공유 라이브러리가 있는지 확인했습니다. |

Mac·Linux의 결과는 [GitHub Actions 빌드](https://github.com/chchlee/winscript-doctor/actions/runs/41777355605)에서 생성했습니다. 릴리스의 Windows 파일은 로컬에서 검증한 파일입니다. 설치 파일 8종에 대한 SHA-256을 대조하고 업로드된 파일의 해시도 확인했습니다.

Mac·Linux 데스크톱에서 실제로 창을 열어 사용하는 전체 흐름과 Debian 설치는 이 검증에 포함되지 않습니다. Windows 설치 프로그램에는 코드 서명이 없고, macOS 패키지는 Developer ID 서명과 Apple 공증이 없는 프리뷰입니다. [설치 방법과 파일 이름](installation.md)을 참고하세요.
