package main

import (
	"context"
	"errors"
	"runtime"
	"time"

	"winscriptdoctor/internal/smb"
)

func (s *DoctorService) ValidateServerShare(path string) (string, error) {
	return smb.SharePath(path)
}

func (s *DoctorService) ValidateServerFile(path string) (string, error) {
	return smb.FilePath(path)
}

func (s *DoctorService) TestServerShare(ctx context.Context, path string) (smb.Result, error) {
	return s.checkServer(ctx, path, "")
}

func (s *DoctorService) InspectServerFile(ctx context.Context, path, file string) (smb.Result, error) {
	relative, err := smb.FilePath(file)
	if err != nil {
		return smb.Result{}, err
	}
	return s.checkServer(ctx, path, relative)
}

func (s *DoctorService) checkServer(ctx context.Context, path, file string) (smb.Result, error) {
	if runtime.GOOS != "windows" {
		return smb.Result{}, errors.New("서버 연결은 Windows 데스크톱 앱에서 사용할 수 있습니다")
	}
	share, err := smb.SharePath(path)
	if err != nil {
		return smb.Result{}, err
	}
	if !s.serverChecking.CompareAndSwap(false, true) {
		return smb.Result{Status: "busy"}, nil
	}
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	result := make(chan smb.Result, 1)
	go func() {
		// Windows may still be waiting for an SMB I/O after the UI times out.
		// Keep the gate until it returns so retries cannot accumulate workers.
		read := smb.Check(ctx, share, file)
		s.serverChecking.Store(false)
		result <- read
	}()
	select {
	case read := <-result:
		if ctx.Err() == nil {
			return read, nil
		}
	case <-ctx.Done():
	}
	return smb.Result{Status: "timeout"}, nil
}
