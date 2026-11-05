package main

import (
	"strings"
	"testing"
)

func TestSelectUpdateChoosesHighestCompatiblePublishedVersion(t *testing.T) {
	asset := func(name string) releaseAsset {
		return releaseAsset{Name: name, State: "uploaded", Digest: "sha256:" + strings.Repeat("a", 64)}
	}
	releases := []githubRelease{
		{Tag: "v0.1.2", Assets: []releaseAsset{asset("WinScriptDoctor-0.1.2-windows-amd64-setup.exe")}},
		{Tag: "v0.2.0", Assets: []releaseAsset{asset("WinScriptDoctor-0.2.0-darwin-arm64.zip")}},
		{Tag: "v0.1.10", Assets: []releaseAsset{asset("WinScriptDoctor-0.1.10-windows-amd64-setup.exe")}},
		{Tag: "v0.9.0", Draft: true, Assets: []releaseAsset{asset("WinScriptDoctor-0.9.0-windows-amd64-setup.exe")}},
	}
	if result := selectUpdate(releases, "0.1.1", "windows", "amd64"); result.Version != "0.1.10" {
		t.Fatalf("unexpected Windows update: %+v", result)
	}
	if result := selectUpdate(releases, "0.1.1", "darwin", "arm64"); result.Version != "0.2.0" {
		t.Fatalf("unexpected Mac update: %+v", result)
	}
	if result := selectUpdate(releases, "0.1.10", "windows", "amd64"); result.Version != "" {
		t.Fatalf("offered an equal or older version: %+v", result)
	}
}
