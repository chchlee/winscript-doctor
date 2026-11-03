# 주요 의존성 고지

이 프로젝트의 코드는 MIT 라이선스로 제공하며, 의존성의 기존 라이선스와 저작권 고지는 유지됩니다.

| 구성 요소          | 출처                                        | 라이선스     |
| ------------------ | ------------------------------------------- | ------------ |
| Wails              | https://github.com/wailsapp/wails           | MIT          |
| React              | https://github.com/facebook/react           | MIT          |
| Tailwind CSS       | https://github.com/tailwindlabs/tailwindcss | MIT          |
| shadcn/ui 컴포넌트 | https://github.com/shadcn-ui/ui             | MIT          |
| Radix Primitives   | https://github.com/radix-ui/primitives      | MIT          |
| Lucide             | https://github.com/lucide-icons/lucide      | ISC          |
| Go 표준 라이브러리 | https://go.dev/LICENSE                      | BSD 3 Clause |

전체 직접·간접 의존성은 go.mod·go.sum과 frontend/package-lock.json에 기록되어 있습니다. 배포 시 각 의존성이 제공하는 라이선스 파일도 보존하세요. WebView2 Runtime은 Microsoft의 별도 배포 조건을 따르며 앱 ZIP에 번들하지 않습니다.

저장소에 포함한 frontend/src/components/ui의 shadcn/ui 기반 코드는 원저작권 고지를 [LICENSES/shadcn-ui-MIT.txt](LICENSES/shadcn-ui-MIT.txt)에 보존합니다. 이 파일은 설치 패키지에도 포함합니다. 원본은 [shadcn/ui 라이선스](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md)입니다.
