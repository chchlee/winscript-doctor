package collector

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"winscriptdoctor/internal/doctor"
)

type sourceFunc func(context.Context, func(TaskAction)) (Inventory, error)

func (f sourceFunc) Read(ctx context.Context, visit func(TaskAction)) (Inventory, error) {
	return f(ctx, visit)
}
func testHost() doctor.Host {
	return doctor.Host{Name: "SYNTHETIC", OS: "Windows test", Account: "EXAMPLE\\test", Permission: "standard"}
}
func writeScript(t *testing.T, root, name, body string) string {
	t.Helper()
	file := filepath.Join(root, name)
	if err := os.WriteFile(file, []byte(body), 0600); err != nil {
		t.Fatal(err)
	}
	return file
}
func hasIssue(w doctor.Workspace, code string) bool {
	for _, issue := range w.Collection.Issues {
		if issue.Code == code {
			return true
		}
	}
	return false
}

var emptySource = sourceFunc(func(context.Context, func(TaskAction)) (Inventory, error) { return Inventory{}, nil })

func TestReadOnlyCollectionRoundTrip(t *testing.T) {
	root := t.TempDir()
	body := "Write-Output 'SYNTHETIC_NEVER_EXECUTE'"
	file := writeScript(t, root, "한글 파일.PS1", body)
	writeScript(t, root, "cleanup.cmd", "@echo SYNTHETIC_ONLY")
	writeScript(t, root, "ignored.txt", "not a script")
	w, err := Collect(context.Background(), root, emptySource, testHost(), DefaultLimits)
	if err != nil {
		t.Fatal(err)
	}
	if len(w.Scripts) != 2 || w.Demo || len(w.Comparisons) != 0 || w.Collection.Status != "complete" {
		t.Fatalf("unexpected result: scripts=%d,status=%s", len(w.Scripts), w.Collection.Status)
	}
	hash := sha256.Sum256([]byte(body))
	found := false
	for _, script := range w.Scripts {
		if script.Path == file {
			found = true
			if script.SHA256 != hex.EncodeToString(hash[:]) || script.Status != "unknown" || script.TaskName != "" {
				t.Fatal("hash or unobserved status changed")
			}
		}
	}
	if !found {
		t.Fatal("script missing")
	}
	after, _ := os.ReadFile(file)
	if string(after) != body {
		t.Fatal("source was changed")
	}
	raw, _ := json.Marshal(w)
	restored, err := doctor.ParseWorkspace(raw)
	if err != nil || len(restored.Scripts) != 2 || restored.Collection.Root != root {
		t.Fatal("collection cannot be reopened", err)
	}
}

func TestPartialLimitsAndSourceErrors(t *testing.T) {
	for _, test := range []struct {
		name, code string
		limits     Limits
		source     TaskSource
	}{
		{"script limit", "script_limit", Limits{1, 100, 100, 100}, emptySource},
		{"file limit", "file_size_limit", Limits{10, 100, 1, 100}, emptySource},
		{"hash budget", "hash_budget", Limits{10, 100, 100, 1}, emptySource},
		{"entry limit", "entry_limit", Limits{10, 1, 100, 100}, emptySource},
		{"source denial", "task_read_failed", DefaultLimits, sourceFunc(func(context.Context, func(TaskAction)) (Inventory, error) {
			return Inventory{}, errors.New("PRIVATE_TASK_ARGUMENT_MUST_NOT_LEAK")
		})},
	} {
		t.Run(test.name, func(t *testing.T) {
			root := t.TempDir()
			writeScript(t, root, "one.ps1", "test-file")
			writeScript(t, root, "two.bat", "test-file")
			w, err := Collect(context.Background(), root, test.source, testHost(), test.limits)
			if err != nil {
				t.Fatal(err)
			}
			raw, _ := json.Marshal(w)
			if !hasIssue(w, test.code) || w.Collection.Status != "partial" || strings.Contains(string(raw), "PRIVATE_TASK_ARGUMENT") {
				t.Fatal("partial result or safe error missing")
			}
		})
	}
}

func TestCancellationPreservesCollectedFiles(t *testing.T) {
	root := t.TempDir()
	writeScript(t, root, "one.ps1", "synthetic")
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	source := sourceFunc(func(context.Context, func(TaskAction)) (Inventory, error) {
		cancel()
		return Inventory{Examined: 1}, ctx.Err()
	})
	w, err := Collect(ctx, root, source, testHost(), DefaultLimits)
	if err != nil || len(w.Scripts) != 1 || w.Collection.Status != "cancelled" || w.Scripts[0].SHA256 == "" {
		t.Fatal("lost collected partial results", err)
	}
}

func TestChangedFileIsNotGivenAStableHash(t *testing.T) {
	root := t.TempDir()
	file := writeScript(t, root, "one.ps1", "before")
	before, _ := os.Lstat(file)
	writeScript(t, root, "one.ps1", "after-longer")
	hash, _, reason := hashFile(context.Background(), file, before, 100)
	if hash != "" || reason != "file_changed" {
		t.Fatal("changed file received a stable hash")
	}
}

func TestSymlinksDoNotExpandScope(t *testing.T) {
	root, outside := t.TempDir(), t.TempDir()
	writeScript(t, outside, "external.ps1", "outside")
	if err := os.Symlink(outside, filepath.Join(root, "linked")); err != nil {
		t.Skip("OS does not allow this test to create a symbolic link")
	}
	w, err := Collect(context.Background(), root, emptySource, testHost(), DefaultLimits)
	if err != nil || len(w.Scripts) != 0 || !hasIssue(w, "reparse_skipped") {
		t.Fatal("followed an excluded link", err)
	}
}

func TestTaskReferencesPreserveMultipleActionsWithoutArguments(t *testing.T) {
	if runtime.GOOS != "windows" {
		t.Skip("filesystem association uses Windows absolute paths; parser tests run on all OSes")
	}
	root := t.TempDir()
	file := writeScript(t, root, "job.ps1", "synthetic")
	source := sourceFunc(func(_ context.Context, visit func(TaskAction)) (Inventory, error) {
		for _, name := range []string{`\B`, `\A`} {
			visit(TaskAction{TaskLink: doctor.TaskLink{Name: name, Action: 1, Executable: "pwsh.exe", Account: `EXAMPLE\test`, LogonType: "S4U"}, arguments: `-File "` + file + `" -Token PRIVATE_ARGUMENT_MUST_NOT_LEAK`})
		}
		visit(TaskAction{TaskLink: doctor.TaskLink{Name: `\Dynamic`, Action: 1, Executable: "pwsh.exe"}, arguments: `-Command "& '` + file + `'"`})
		return Inventory{Examined: 3}, nil
	})
	w, err := Collect(context.Background(), root, source, testHost(), DefaultLimits)
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := json.Marshal(w)
	if len(w.Scripts[0].TaskLinks) != 2 || w.Scripts[0].TaskName != `\A` || len(w.Comparisons) != 0 || !hasIssue(w, "task_unresolved") || strings.Contains(string(raw), "PRIVATE_ARGUMENT") || strings.Contains(string(raw), "arguments") {
		t.Fatal("incorrect direct references or raw arguments leaked")
	}
}

func TestLargeCollectionKeepsAReopenablePartialSnapshot(t *testing.T) {
	if runtime.GOOS != "windows" {
		t.Skip("uses Windows filesystem association; snapshot validators run on all OSes")
	}
	root := t.TempDir()
	files := make([]string, 130)
	for i := range files {
		files[i] = writeScript(t, root, fmt.Sprintf("script-%03d.ps1", i), "synthetic")
	}
	source := sourceFunc(func(_ context.Context, visit func(TaskAction)) (Inventory, error) {
		for i, file := range files {
			for action := 1; action <= 8; action++ {
				visit(TaskAction{TaskLink: doctor.TaskLink{Name: `\` + strings.Repeat("N", 460) + fmt.Sprintf("%03d-%d", i, action), Action: action, Executable: `C:\` + strings.Repeat("x", 3800) + `\pwsh.exe`, WorkingDirectory: `C:\` + strings.Repeat("w", 3800), Account: strings.Repeat("a", 500)}, arguments: `-File "` + file + `"`})
			}
		}
		return Inventory{Examined: 130}, nil
	})
	w, err := Collect(context.Background(), root, source, testHost(), DefaultLimits)
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := json.Marshal(w)
	if len(raw) > doctor.MaxSnapshotBytes || !hasIssue(w, "snapshot_limit") || len(w.Scripts) == 0 || len(w.Scripts) >= 130 {
		t.Fatal("snapshot output was not safely bounded")
	}
	if _, err := doctor.ParseWorkspace(raw); err != nil {
		t.Fatal("partial snapshot cannot be reopened", err)
	}
}
