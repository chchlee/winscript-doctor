package main

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"sync"
	"sync/atomic"
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"
	"winscriptdoctor/internal/collector"
	"winscriptdoctor/internal/doctor"
)

// DoctorService exposes data inspection only. It has no shell execution method.
type DoctorService struct {
	app              *application.App
	collectionMu     sync.Mutex
	collectionCancel context.CancelFunc
	serverChecking   atomic.Bool
}

func (s *DoctorService) GetCapabilities() map[string]bool {
	return map[string]bool{"localCollection": true, "serverFiles": runtime.GOOS == "windows"}
}

func (s *DoctorService) CollectLocal() (*doctor.Workspace, error) {
	s.collectionMu.Lock()
	if s.collectionCancel != nil {
		s.collectionMu.Unlock()
		return nil, errors.New("이미 수집 중입니다")
	}
	ctx, cancel := context.WithCancel(context.Background())
	s.collectionCancel = cancel
	s.collectionMu.Unlock()
	defer func() { cancel(); s.collectionMu.Lock(); s.collectionCancel = nil; s.collectionMu.Unlock() }()
	root, err := s.app.Dialog.OpenFile().SetTitle("수집할 로컬 스크립트 폴더 선택").CanChooseFiles(false).CanChooseDirectories(true).PromptForSingleSelection()
	if err != nil {
		return nil, errors.New("폴더 선택 창을 열지 못했습니다")
	}
	if root == "" || ctx.Err() != nil {
		return nil, nil
	}
	ctx, timeoutCancel := context.WithTimeout(ctx, 45*time.Second)
	defer timeoutCancel()
	workspace, err := collector.CollectLocal(ctx, root)
	if err != nil {
		return nil, err
	}
	return &workspace, nil
}

func (s *DoctorService) CancelCollection() bool {
	s.collectionMu.Lock()
	defer s.collectionMu.Unlock()
	if s.collectionCancel == nil {
		return false
	}
	s.collectionCancel()
	return true
}

func (s *DoctorService) GetWorkspace() (doctor.Workspace, error) {
	return doctor.DemoWorkspace()
}

func (s *DoctorService) ParseSnapshot(raw string) (doctor.Workspace, error) {
	return doctor.ParseWorkspace([]byte(raw))
}

func (s *DoctorService) Compare(left, right doctor.ExecutionContext) doctor.ComparisonResult {
	return doctor.CompareContexts(left, right)
}

func (s *DoctorService) OpenWorkspace() (*doctor.Workspace, error) {
	path, err := s.app.Dialog.OpenFile().
		SetTitle("WinScript Doctor 스냅샷 열기").
		AddFilter("JSON 스냅샷", "*.json").
		CanChooseFiles(true).
		PromptForSingleSelection()
	if err != nil {
		return nil, errors.New("파일 선택 창을 열지 못했습니다")
	}
	if path == "" {
		return nil, nil
	}
	file, err := os.Open(path)
	if err != nil {
		return nil, errors.New("스냅샷을 읽지 못했습니다")
	}
	defer file.Close()
	raw, err := io.ReadAll(io.LimitReader(file, doctor.MaxSnapshotBytes+1))
	if err != nil {
		return nil, errors.New("스냅샷을 읽지 못했습니다")
	}
	workspace, err := doctor.ParseWorkspace(raw)
	if err != nil {
		return nil, err
	}
	return &workspace, nil
}

func (s *DoctorService) ExportWorkspace(workspace doctor.Workspace) (bool, error) {
	raw, err := json.Marshal(workspace)
	if err != nil {
		return false, errors.New("스냅샷을 저장할 수 없습니다")
	}
	validated, err := doctor.ParseWorkspace(raw)
	if err != nil {
		return false, err
	}
	// Keep the same compact representation used by the import size limit.
	raw, err = json.Marshal(validated)
	if err != nil {
		return false, errors.New("스냅샷을 저장할 수 없습니다")
	}
	path, err := s.app.Dialog.SaveFile().
		SetMessage("내부용 스냅샷 저장").
		SetFilename("winscript-doctor-snapshot.json").
		AddFilter("JSON 스냅샷", "*.json").
		PromptForSingleSelection()
	if err != nil {
		return false, errors.New("파일 선택 창을 열지 못했습니다")
	}
	if path == "" {
		return false, nil
	}
	if filepath.Ext(path) == "" {
		path += ".json"
	}
	// Write beside the destination, then rename so an interrupted write cannot
	// leave a partially written snapshot. Only the user-selected file is replaced.
	temp, err := os.CreateTemp(filepath.Dir(path), ".wsd-*.json")
	if err != nil {
		return false, errors.New("저장 위치에 파일을 쓸 수 없습니다")
	}
	tempPath := temp.Name()
	defer os.Remove(tempPath)
	if _, err = temp.Write(raw); err != nil {
		temp.Close()
		return false, errors.New("스냅샷 저장에 실패했습니다")
	}
	if err = temp.Close(); err != nil {
		return false, errors.New("스냅샷 저장에 실패했습니다")
	}
	if err = os.Rename(tempPath, path); err != nil {
		return false, errors.New("스냅샷을 저장하지 못했습니다. 대상 파일이 열려 있는지 확인하세요")
	}
	return true, nil
}
