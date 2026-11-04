# 기여 안내

프로젝트는 초기 프로토타입입니다. [개선 순서](docs/roadmap.md)와 [현재 구현 범위](README.md)를 먼저 확인하세요. 큰 기능은 구현 전에 재현할 운영 문제와 기대 결과를 이슈에 남겨 범위를 맞춥니다.

## 개발과 검증

Go 1.27.3, Node 24, Wails CLI 3.1.0을 사용합니다. 먼저 frontend에서 npm ci를 실행하고, [플랫폼별 개발 라이브러리](docs/installation.md)를 준비합니다.

Windows에서는 다음을 실행합니다.

```powershell
.\scripts\test.ps1
.\scripts\build.ps1
```

macOS·Linux에서는 Playwright Chromium을 준비한 뒤 다음을 실행합니다.

```sh
cd frontend
node node_modules/@playwright/test/cli.js install chromium
cd ..
sh scripts/test.sh
sh scripts/build.sh
```

GUI만 확인하려면 frontend에서 npm run dev를 실행합니다. 네이티브 파일 대화상자와 Go 서비스 연결은 scripts/dev.ps1 또는 sh scripts/dev.sh로 별도로 확인합니다. 브라우저 테스트 통과를 실제 데스크톱 설치 검증으로 기록하지 않습니다.

## 변경 제출

- PR에는 문제를 재현하는 조건, 바뀐 동작, 실행한 검증과 미확인 OS를 적습니다. UI 변경에는 합성 데이터의 화면을 첨부합니다.
- Go 파일은 gofmt, 프런트엔드와 mjs 파일은 프로젝트 Prettier 설정을 사용합니다.
- 버그 수정은 해당 실패를 재현하는 테스트를 추가합니다. 데이터 계약을 바꾸면 Go·프런트엔드 검증과 공통 예제를 함께 갱신합니다.
- 실제 서버 스냅샷, 원본 업무 스크립트, 자격 증명, .env, 인증서와 사용자 프로필은 제출하지 않습니다. 재현 자료는 fixtures의 합성 예제에서 만듭니다.
- 수집 기능은 관측 사실·추정·미확인을 구분하고 부분 결과를 보존합니다. 원본 작업과 업무 스크립트를 변경하거나 자동 실행하는 기능은 별도 논의가 필요합니다.

GitHub Actions의 데스크톱 빌드는 수동 실행 또는 기본 브랜치의 워크플로 파일 변경 시 실행합니다. 워크플로는 설치 파일을 아티팩트로 올립니다.
