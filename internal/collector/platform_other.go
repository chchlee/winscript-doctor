//go:build !windows

package collector

import (
	"context"
	"errors"
	"io/fs"
	"winscriptdoctor/internal/doctor"
)

func Supported() bool                 { return false }
func isReparse(info fs.FileInfo) bool { return info.Mode()&fs.ModeSymlink != 0 }
func CollectLocal(ctx context.Context, root string) (doctor.Workspace, error) {
	return doctor.Workspace{}, errors.New("로컬 수집은 Windows에서 사용할 수 있습니다. 저장된 스냅샷은 모든 지원 OS에서 열 수 있습니다")
}
