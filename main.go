package main

import (
	"embed"
	"log"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	dataDir, err := os.UserConfigDir()
	if err != nil {
		log.Fatal("사용자 설정 폴더를 확인할 수 없습니다")
	}
	service := &DoctorService{}
	app := application.New(application.Options{
		Name:        "WinScript Doctor",
		Description: "Windows 자동화의 실행 환경을 비교하는 도구",
		Services: []application.Service{
			application.NewService(service),
		},
		Assets: application.AssetOptions{Handler: application.AssetFileServerFS(assets)},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
		Windows: application.WindowsOptions{
			WebviewUserDataPath:   filepath.Join(dataDir, "WinScriptDoctor", "WebView2"),
			AdditionalBrowserArgs: diagnosticBrowserArgs(),
		},
	})
	service.app = app
	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Name:             "main",
		Title:            "WinScript Doctor",
		Width:            1440,
		Height:           980,
		MinWidth:         1024,
		MinHeight:        720,
		BackgroundColour: application.NewRGB(246, 248, 249),
		URL:              "/",
	})
	if err := app.Run(); err != nil {
		log.Fatal("WinScript Doctor를 실행하지 못했습니다")
	}
}
