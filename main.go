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
		log.Fatal("Could not locate the user configuration directory")
	}
	service := &DoctorService{}
	app := application.New(application.Options{
		Name:        "WinScript Doctor",
		Description: "Read-only script inventory and execution environment comparison",
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
		BackgroundColour: application.NewRGB(255, 255, 255),
		URL:              "/",
	})
	if err := app.Run(); err != nil {
		log.Fatal("Could not start WinScript Doctor")
	}
}
