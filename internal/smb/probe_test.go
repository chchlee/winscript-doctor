package smb

import (
	"context"
	"crypto/sha256"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestSharePath(t *testing.T) {
	got, err := SharePath("//ops.example.test/스크립트/일일/")
	if err != nil || got != `\\ops.example.test\스크립트\일일` {
		t.Fatalf("canonical share = %q, %v", got, err)
	}
	for _, path := range []string{
		"", `\`, `\\`, `C:\share`, `\\server`, `\\?\UNC\server\share`, `\\.\pipe\test`,
		`\\user@server\share`, `\\server@SSL\DavWWWRoot`, `\\server\IPC$\test`,
		`\\server\share\..\other`, `\\server\share\NUL.txt`, `\\server\share\dir. `,
		`\\server\share\dir:stream`, `\\server\\share`, "\\\\server\\share\x00",
		strings.Repeat("x", 4097),
	} {
		if _, err := SharePath(path); err == nil {
			t.Errorf("accepted unsafe share %q", path)
		}
	}
}

func TestFilePath(t *testing.T) {
	got, err := FilePath("scripts/점검.bash")
	if err != nil || got != `scripts\점검.bash` {
		t.Fatalf("canonical file = %q, %v", got, err)
	}
	for _, path := range []string{
		"", `C:\backup.sh`, `C:backup.sh`, `\\elsewhere\data\backup.sh`, `\backup.sh`,
		`../backup.sh`, `scripts/../backup.sh`, `scripts/./backup.sh`, `scripts//backup.sh`,
		`backup.sh:stream`, `backup.sh.`, `backup.sh `, `backup*.sh`, `scripts\`,
		`conin$`, `LPT¹.txt`, "bad\n.sh", "bad\u202e.sh",
	} {
		if _, err := FilePath(path); err == nil {
			t.Errorf("accepted unsafe file %q", path)
		}
	}
}

func TestHashFile(t *testing.T) {
	dir := t.TempDir()
	root, err := os.OpenRoot(dir)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { root.Close() })
	data := []byte("#!/bin/bash\nprintf 'synthetic fixture'")
	file := filepath.Join(dir, "probe.bash")
	if err := os.WriteFile(file, data, 0600); err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	got := hashFile(ctx, root, "probe.bash")
	if got.Status != "ok" || got.SHA256 != fmt.Sprintf("%x", sha256.Sum256(data)) {
		t.Fatalf("hash result = %+v", got)
	}
	if got := hashFile(ctx, root, "missing.sh"); got.Status != "missing" || got.SHA256 != "" {
		t.Fatalf("missing result = %+v", got)
	}
	if got := hashFile(ctx, root, "."); got.Status != "invalid_file" || got.SHA256 != "" {
		t.Fatalf("directory result = %+v", got)
	}
	if err := os.Truncate(file, MaxFileBytes+1); err != nil {
		t.Fatal(err)
	}
	if got := hashFile(ctx, root, "probe.bash"); got.Status != "too_large" || got.SHA256 != "" {
		t.Fatalf("size limit result = %+v", got)
	}
}

func TestHashFileCannotFollowLinkOutOfShare(t *testing.T) {
	outside := t.TempDir()
	if err := os.WriteFile(filepath.Join(outside, "private.sh"), []byte("synthetic"), 0600); err != nil {
		t.Fatal(err)
	}
	dir := t.TempDir()
	if err := os.Symlink(outside, filepath.Join(dir, "redirect")); err != nil {
		t.Skip("OS does not permit test symlink creation")
	}
	root, err := os.OpenRoot(dir)
	if err != nil {
		t.Fatal(err)
	}
	defer root.Close()
	got := hashFile(context.Background(), root, filepath.Join("redirect", "private.sh"))
	if got.Status == "ok" || got.SHA256 != "" {
		t.Fatalf("read outside share: %+v", got)
	}
}
