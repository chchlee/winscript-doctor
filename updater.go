package main

import (
	"context"
	_ "embed"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"regexp"
	"runtime"
	"slices"
	"strconv"
	"strings"
	"time"
)

//go:embed frontend/src/version.json
var versionData []byte

var appVersion = func() string {
	var info struct{ Version string }
	if err := json.Unmarshal(versionData, &info); err != nil || !versionPattern.MatchString(info.Version) {
		panic("invalid app version")
	}
	return info.Version
}()

const releaseRepo = "chchlee/winscript-doctor"
const releaseURL = "https://github.com/" + releaseRepo + "/releases"

var versionPattern = regexp.MustCompile(`^(0|[1-9][0-9]{0,8})\.(0|[1-9][0-9]{0,8})\.(0|[1-9][0-9]{0,8})$`)
var digestPattern = regexp.MustCompile(`^sha256:[a-f0-9]{64}$`)

type releaseAsset struct {
	Name   string `json:"name"`
	State  string `json:"state"`
	Digest string `json:"digest"`
}

type githubRelease struct {
	Tag    string         `json:"tag_name"`
	Draft  bool           `json:"draft"`
	Assets []releaseAsset `json:"assets"`
}

type UpdateInfo struct {
	CurrentVersion string `json:"currentVersion"`
	Version        string `json:"version"`
	File           string `json:"file"`
}

func versionNumber(version string) ([3]uint32, bool) {
	var number [3]uint32
	if !versionPattern.MatchString(version) {
		return number, false
	}
	for i, part := range strings.Split(version, ".") {
		value, _ := strconv.ParseUint(part, 10, 32)
		number[i] = uint32(value)
	}
	return number, true
}

func updateFile(version, os, arch string) string {
	if arch != "amd64" && arch != "arm64" {
		return ""
	}
	switch os {
	case "windows":
		if arch == "amd64" {
			return "WinScriptDoctor-" + version + "-windows-amd64-setup.exe"
		}
	case "darwin":
		return "WinScriptDoctor-" + version + "-darwin-" + arch + ".zip"
	case "linux":
		return "winscript-doctor_" + version + "_" + arch + ".deb"
	}
	return ""
}

func selectUpdate(releases []githubRelease, current, os, arch string) UpdateInfo {
	result := UpdateInfo{CurrentVersion: current}
	best, _ := versionNumber(current)
	for _, release := range releases {
		version, hasPrefix := strings.CutPrefix(release.Tag, "v")
		number, valid := versionNumber(version)
		if release.Draft || !hasPrefix || !valid || slices.Compare(number[:], best[:]) <= 0 {
			continue
		}
		file := updateFile(version, os, arch)
		for _, asset := range release.Assets {
			if file != "" && asset.Name == file && asset.State == "uploaded" && digestPattern.MatchString(asset.Digest) {
				best = number
				result.Version = version
				result.File = file
				break
			}
		}
	}
	return result
}

func (s *DoctorService) CheckForUpdate(ctx context.Context) (UpdateInfo, error) {
	const limit = 2 << 20
	const endpoint = "https://api.github.com/repos/" + releaseRepo + "/releases?per_page=30"
	current := appVersion
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return UpdateInfo{}, err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "WinScriptDoctor/"+current)
	client := http.Client{Timeout: 6 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error {
		return http.ErrUseLastResponse
	}}
	resp, err := client.Do(req)
	if err != nil {
		return UpdateInfo{}, errors.New("GitHub 릴리스에 연결하지 못했습니다.")
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return UpdateInfo{}, errors.New("GitHub 릴리스 정보를 가져오지 못했습니다.")
	}
	data, err := io.ReadAll(io.LimitReader(resp.Body, limit+1))
	if err != nil || len(data) > limit {
		return UpdateInfo{}, errors.New("GitHub 릴리스 응답을 읽지 못했습니다.")
	}
	var releases []githubRelease
	if err := json.Unmarshal(data, &releases); err != nil {
		return UpdateInfo{}, errors.New("GitHub 릴리스 응답 형식이 올바르지 않습니다.")
	}
	return selectUpdate(releases, current, runtime.GOOS, runtime.GOARCH), nil
}

func (s *DoctorService) OpenUpdateDownload(version string) error {
	number, valid := versionNumber(version)
	current, _ := versionNumber(appVersion)
	file := updateFile(version, runtime.GOOS, runtime.GOARCH)
	if !valid || slices.Compare(number[:], current[:]) <= 0 || file == "" {
		return errors.New("이 버전의 설치 파일을 열 수 없습니다.")
	}
	return s.app.Browser.OpenURL(releaseURL + "/download/v" + version + "/" + file)
}
