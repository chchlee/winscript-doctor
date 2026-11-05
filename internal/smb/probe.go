package smb

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"io"
	"io/fs"
	"os"
	"strings"
)

const MaxFileBytes = 16 << 20

type Result struct {
	Status string `json:"status"`
	SHA256 string `json:"sha256,omitempty"`
}

// Check expects canonical paths from SharePath and FilePath. An empty file
// tests whether the current Windows session can read the share directory.
func Check(ctx context.Context, share, file string) Result {
	parts := strings.SplitN(share[2:], `\`, 3)
	root, err := os.OpenRoot(`\\` + parts[0] + `\` + parts[1])
	if err != nil {
		return readError(err)
	}
	defer root.Close()
	if ctx.Err() != nil {
		return Result{Status: "timeout"}
	}
	if len(parts) == 3 {
		root, err = root.OpenRoot(parts[2])
		if err != nil {
			return readError(err)
		}
		defer root.Close()
	}
	if file == "" {
		dir, err := root.Open(".")
		if err != nil {
			return readError(err)
		}
		defer dir.Close()
		if _, err = dir.Readdirnames(1); err != nil && !errors.Is(err, io.EOF) {
			return readError(err)
		}
		return Result{Status: "ok"}
	}
	return hashFile(ctx, root, file)
}

func hashFile(ctx context.Context, root *os.Root, file string) Result {
	before, err := root.Lstat(file)
	if err != nil {
		return readError(err)
	}
	if !before.Mode().IsRegular() {
		return Result{Status: "invalid_file"}
	}
	handle, err := root.Open(file)
	if err != nil {
		return readError(err)
	}
	defer handle.Close()
	opened, err := handle.Stat()
	if err != nil {
		return readError(err)
	}
	if !opened.Mode().IsRegular() || !os.SameFile(before, opened) {
		return Result{Status: "changed"}
	}
	if opened.Size() > MaxFileBytes {
		return Result{Status: "too_large"}
	}
	hash := sha256.New()
	buffer := make([]byte, 32*1024)
	var read int64
	for {
		if ctx.Err() != nil {
			return Result{Status: "timeout"}
		}
		count, err := handle.Read(buffer[:min(int64(len(buffer)), MaxFileBytes-read+1)])
		read += int64(count)
		if read > MaxFileBytes {
			return Result{Status: "too_large"}
		}
		hash.Write(buffer[:count])
		if err == io.EOF {
			break
		}
		if err != nil {
			return readError(err)
		}
	}
	after, err := handle.Stat()
	current, pathErr := root.Lstat(file)
	if err != nil || pathErr != nil || !current.Mode().IsRegular() || !os.SameFile(opened, current) ||
		opened.Size() != read || opened.Size() != after.Size() || !opened.ModTime().Equal(after.ModTime()) {
		return Result{Status: "changed"}
	}
	return Result{Status: "ok", SHA256: hex.EncodeToString(hash.Sum(nil))}
}

func readError(err error) Result {
	switch {
	case errors.Is(err, fs.ErrPermission), accessError(err):
		return Result{Status: "denied"}
	case errors.Is(err, fs.ErrNotExist):
		return Result{Status: "missing"}
	default:
		return Result{Status: "unavailable"}
	}
}
