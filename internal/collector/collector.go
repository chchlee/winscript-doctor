// Package collector reads selected files and task metadata. It has no API to
// execute business scripts, register tasks, or change source files.
package collector

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	"winscriptdoctor/internal/doctor"
)

type TaskAction struct {
	doctor.TaskLink
	arguments string // Ephemeral: never serialized, logged or placed in a snapshot.
}

type Inventory struct {
	Examined int
	Partial  bool
	Limited  bool
}
type TaskSource interface {
	Read(context.Context, func(TaskAction)) (Inventory, error)
}
type Limits struct {
	Scripts, Entries     int
	FileBytes, HashBytes int64
}

var DefaultLimits = Limits{Scripts: 500, Entries: 25000, FileBytes: 16 << 20, HashBytes: 256 << 20}

func scriptEngine(file string) string {
	switch strings.ToLower(filepath.Ext(file)) {
	case ".ps1":
		return "PowerShell"
	case ".bat", ".cmd":
		return "Batch"
	case ".sh", ".bash":
		return "Shell"
	default:
		return ""
	}
}

func validText(value string, limit int) bool {
	if !utf8.ValidString(value) || len(value) > limit {
		return false
	}
	for _, r := range value {
		if unicode.IsControl(r) {
			return false
		}
	}
	return true
}

func Collect(ctx context.Context, root string, source TaskSource, host doctor.Host, limits Limits) (doctor.Workspace, error) {
	absolute, err := filepath.Abs(root)
	if err != nil || !validText(absolute, 4096) {
		return doctor.Workspace{}, errors.New("선택한 로컬 폴더를 확인하세요")
	}
	info, err := os.Lstat(absolute)
	if err != nil || !info.IsDir() || isReparse(info) {
		return doctor.Workspace{}, errors.New("일반 로컬 폴더만 수집할 수 있습니다")
	}
	dir, err := os.OpenRoot(absolute)
	if err != nil {
		return doctor.Workspace{}, errors.New("선택한 폴더를 열 수 없습니다")
	}
	defer dir.Close()
	if opened, err := dir.Stat("."); err != nil || !os.SameFile(info, opened) {
		return doctor.Workspace{}, errors.New("수집 폴더가 변경되었습니다. 다시 선택하세요")
	}
	if limits.Scripts < 1 || limits.Entries < 1 || limits.FileBytes < 1 || limits.HashBytes < 1 {
		return doctor.Workspace{}, errors.New("수집 제한을 확인하세요")
	}
	now := time.Now().UTC().Format(time.RFC3339)
	host.CollectedAt = now
	workspace := doctor.Workspace{SchemaVersion: 2, ID: fmt.Sprintf("collection-%d", time.Now().UnixNano()), Host: host, Scripts: []doctor.Script{}, Findings: []doctor.Finding{}, Comparisons: []doctor.ContextPair{}, Collection: &doctor.Collection{Root: absolute, StartedAt: now, TaskStatus: "unavailable", Issues: []doctor.CollectionIssue{}}}
	issues := map[string]int{}
	add := func(code string) {
		if issues[code] < 100000 {
			issues[code]++
		}
	}
	entries, hashed := 0, int64(0)
	err = fs.WalkDir(dir.FS(), ".", func(relative string, entry fs.DirEntry, walkErr error) error {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		entries++
		if entries > limits.Entries {
			add("entry_limit")
			return fs.SkipAll
		}
		if walkErr != nil {
			add("directory_unreadable")
			return nil
		}
		file := filepath.Join(absolute, filepath.FromSlash(relative))
		stat, err := dir.Lstat(relative)
		if err != nil {
			add("directory_unreadable")
			return nil
		}
		if isReparse(stat) {
			add("reparse_skipped")
			if entry.IsDir() {
				return fs.SkipDir
			}
			return nil
		}
		engine := scriptEngine(file)
		if !stat.Mode().IsRegular() || engine == "" {
			return nil
		}
		if len(workspace.Scripts) >= limits.Scripts {
			add("script_limit")
			return fs.SkipAll
		}
		if !validText(file, 4096) || !validText(entry.Name(), 512) {
			add("metadata_limit")
			return nil
		}
		idBytes := sha256.Sum256([]byte(file))
		script := doctor.Script{ID: "script-" + hex.EncodeToString(idBytes[:12]), Name: entry.Name(), Path: file, Engine: engine, Status: "unknown", LastRun: "미확인", Description: "선택한 폴더에서 수집했습니다. 실행 결과와 대상 계정의 접근 권한은 미확인입니다."}
		switch {
		case stat.Size() > limits.FileBytes:
			add("file_size_limit")
		case stat.Size() > limits.HashBytes-hashed:
			add("hash_budget")
		default:
			var read int64
			var reason string
			script.SHA256, read, reason = hashFile(ctx, dir, relative, stat, min(limits.FileBytes, limits.HashBytes-hashed))
			hashed += read
			if reason != "" {
				add(reason)
			}
		}
		workspace.Scripts = append(workspace.Scripts, script)
		return nil
	})
	if err != nil && !errors.Is(err, context.Canceled) && !errors.Is(err, context.DeadlineExceeded) {
		add("directory_unreadable")
	}
	index := map[string]int{}
	for i, script := range workspace.Scripts {
		key := windowsPath(script.Path, "")
		if _, exists := index[key]; exists {
			index[key] = -1
		} else {
			index[key] = i
		}
	}
	if ctx.Err() == nil && source != nil {
		inventory, readErr := source.Read(ctx, func(action TaskAction) {
			if ctx.Err() != nil {
				return
			}
			ref, unresolved := directReference(action)
			if unresolved {
				add("task_unresolved")
			}
			i, exists := index[ref]
			if ref == "" || !exists {
				return
			}
			if i < 0 {
				add("task_unresolved")
				return
			}
			link := action.TaskLink
			if !validLink(link) {
				add("metadata_limit")
				return
			}
			script := &workspace.Scripts[i]
			for _, existing := range script.TaskLinks {
				if existing.Name == link.Name && existing.Action == link.Action {
					return
				}
			}
			if len(script.TaskLinks) >= 8 {
				add("link_limit")
				return
			}
			script.TaskLinks = append(script.TaskLinks, link)
		})
		workspace.Collection.ExaminedTasks = min(max(inventory.Examined, 0), 5000)
		workspace.Collection.TaskStatus = "complete"
		if inventory.Partial {
			workspace.Collection.TaskStatus = "partial"
			add("task_read_failed")
		}
		if inventory.Limited {
			workspace.Collection.TaskStatus = "partial"
			add("task_limit")
		}
		if readErr != nil {
			workspace.Collection.TaskStatus = "unavailable"
			add("task_read_failed")
		}
	} else if source == nil {
		workspace.Collection.TaskStatus = "not_applicable"
	}
	for i := range workspace.Scripts {
		script := &workspace.Scripts[i]
		sort.Slice(script.TaskLinks, func(a, b int) bool {
			x, y := script.TaskLinks[a], script.TaskLinks[b]
			if x.Name == y.Name {
				return x.Action < y.Action
			}
			return x.Name < y.Name
		})
		title, explanation := "직접 참조 미발견", "읽을 수 있었던 예약 작업의 명시적인 참조에서 이 파일을 찾지 못했습니다. 동적 호출, 외부 도구, 수집 제한이 있을 수 있으므로 미사용 파일로 판단하지 않습니다."
		nextStep := "연결된 작업 설정과 해시를 확인하고, 실행 환경 프로브로 수동·예약 조건을 별도로 수집하세요."
		if source == nil || script.Engine == "Shell" {
			title, explanation = "예약 작업 참조 미수집", "이 스크립트는 파일 메타데이터와 SHA-256만 수집하는 범위에 포함됩니다."
			nextStep = "파일 경로와 수집된 해시를 확인하세요."
		}
		evidenceState := "unknown"
		if len(script.TaskLinks) > 0 {
			evidenceState = "observed"
			script.TaskName = script.TaskLinks[0].Name
			title, explanation = "예약 작업 직접 참조 확인", "예약 작업의 실행 설정에서 이 스크립트의 명시적인 참조를 확인했습니다. 계정과 작업 폴더는 저장된 설정이며 실제 실행 환경의 수집 결과가 아닙니다."
			for _, link := range script.TaskLinks {
				if link.LastRunTime > script.LastRun || script.LastRun == "미확인" {
					if link.LastRunTime != "" {
						script.LastRun = link.LastRunTime
					}
				}
			}
		}
		workspace.Findings = append(workspace.Findings, doctor.Finding{ID: "finding-" + script.ID, RuleID: "WSDC01", ScriptID: script.ID, Title: title, Explanation: explanation, Severity: "info", EvidenceState: evidenceState, NextStep: nextStep, Evidence: []string{"선택한 폴더에서 파일 메타데이터를 읽었습니다. 원본 스크립트는 실행하지 않았습니다."}})
	}
	workspace.Collection.CompletedAt = time.Now().UTC().Format(time.RFC3339)
	finish := func() {
		workspace.Collection.Status = "complete"
		if len(issues) > 0 {
			workspace.Collection.Status = "partial"
		}
		if ctx.Err() != nil {
			workspace.Collection.Status = "cancelled"
			if errors.Is(ctx.Err(), context.DeadlineExceeded) {
				issues["time_limit"] = 1
			}
		}
		workspace.Collection.Issues = []doctor.CollectionIssue{}
		keys := make([]string, 0, len(issues))
		for key := range issues {
			keys = append(keys, key)
		}
		sort.Strings(keys)
		for _, key := range keys {
			workspace.Collection.Issues = append(workspace.Collection.Issues, doctor.CollectionIssue{Code: key, Count: issues[key]})
		}
	}
	finish()
	// Preserve a valid, reopenable partial result within the existing size limit.
	for {
		raw, marshalErr := json.Marshal(workspace)
		if marshalErr != nil {
			return doctor.Workspace{}, errors.New("수집 결과를 구성하지 못했습니다")
		}
		if len(raw) <= doctor.MaxSnapshotBytes {
			return doctor.ParseWorkspace(raw)
		}
		if len(workspace.Scripts) == 0 {
			return doctor.Workspace{}, errors.New("수집 결과가 저장 크기 제한을 초과했습니다")
		}
		keep := min(len(workspace.Scripts)-1, len(workspace.Scripts)*doctor.MaxSnapshotBytes/len(raw))
		issues["snapshot_limit"] += len(workspace.Scripts) - keep
		workspace.Scripts = workspace.Scripts[:keep]
		workspace.Findings = workspace.Findings[:keep]
		finish()
	}
}

func validLink(link doctor.TaskLink) bool {
	for _, field := range []struct {
		value string
		limit int
	}{{link.Name, 512}, {link.Executable, 4096}, {link.WorkingDirectory, 4096}, {link.Account, 512}, {link.LogonType, 64}} {
		if !validText(field.value, field.limit) {
			return false
		}
	}
	return link.Name != "" && link.Executable != "" && link.Action >= 1 && link.Action <= 32
}

func hashFile(ctx context.Context, root *os.Root, file string, before fs.FileInfo, limit int64) (string, int64, string) {
	f, err := root.OpenFile(file, os.O_RDONLY|scriptReadFlags, 0)
	if err != nil {
		return "", 0, "hash_failed"
	}
	defer f.Close()
	opened, err := f.Stat()
	if err != nil || !opened.Mode().IsRegular() || !os.SameFile(before, opened) || isReparse(opened) {
		return "", 0, "file_changed"
	}
	hash := sha256.New()
	buffer := make([]byte, 32*1024)
	var read int64
	for {
		if ctx.Err() != nil {
			return "", read, "hash_failed"
		}
		n, readErr := f.Read(buffer[:min(int64(len(buffer)), limit-read+1)])
		read += int64(n)
		if read > limit {
			return "", read, "file_size_limit"
		}
		if n > 0 {
			hash.Write(buffer[:n])
		}
		if readErr == io.EOF {
			break
		}
		if readErr != nil {
			return "", read, "hash_failed"
		}
	}
	after, err := f.Stat()
	pathInfo, pathErr := root.Lstat(file)
	if err != nil || pathErr != nil || !os.SameFile(before, pathInfo) || isReparse(pathInfo) || before.Size() != after.Size() || !before.ModTime().Equal(after.ModTime()) {
		return "", read, "file_changed"
	}
	return hex.EncodeToString(hash.Sum(nil)), read, ""
}
