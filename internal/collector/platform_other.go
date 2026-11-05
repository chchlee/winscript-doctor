//go:build !windows

package collector

import (
	"context"
	"io/fs"
	"os"
	"os/user"
	"runtime"

	"golang.org/x/sys/unix"
	"winscriptdoctor/internal/doctor"
)

// If a file is swapped for a FIFO during collection, opening it must not block.
const scriptReadFlags = unix.O_NONBLOCK | unix.O_NOFOLLOW

func isReparse(info fs.FileInfo) bool { return info.Mode()&fs.ModeSymlink != 0 }
func CollectLocal(ctx context.Context, root string) (doctor.Workspace, error) {
	host := doctor.Host{Name: "미확인", OS: runtime.GOOS, Account: "미확인", Permission: "standard"}
	if name, err := os.Hostname(); err == nil && validText(name, 256) && name != "" {
		host.Name = name
	}
	if account, err := user.Current(); err == nil && validText(account.Username, 512) && account.Username != "" {
		host.Account = account.Username
	}
	if os.Geteuid() == 0 {
		host.Permission = "elevated"
	}
	return Collect(ctx, root, nil, host, DefaultLimits)
}
