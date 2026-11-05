package doctor

import (
	"errors"
	"regexp"
	"time"
)

var hashPattern = regexp.MustCompile(`^[a-f0-9]{64}$`)
var resultPattern = regexp.MustCompile(`^0x[0-9A-F]{8}$`)

func ValidCollectionIssue(code string) bool {
	return oneOf(code, "directory_unreadable", "metadata_limit", "hash_failed", "file_changed", "entry_limit", "script_limit", "hash_budget", "file_size_limit", "reparse_skipped", "task_read_failed", "task_limit", "task_unresolved", "link_limit", "snapshot_limit", "time_limit")
}

func validScriptCollection(script Script) bool {
	if script.SHA256 != "" && !hashPattern.MatchString(script.SHA256) {
		return false
	}
	if len(script.TaskLinks) > 8 {
		return false
	}
	seen := map[string]map[int]bool{}
	for _, link := range script.TaskLinks {
		if !required(link.Name, 512) || link.Action < 1 || link.Action > 32 || !required(link.Executable, 4096) || !text(link.WorkingDirectory, 4096) || !text(link.Account, 512) || !text(link.LogonType, 64) || (link.LastRunTime != "" && !timestamp(link.LastRunTime)) || (link.LastResult != "" && !resultPattern.MatchString(link.LastResult)) {
			return false
		}
		if seen[link.Name] == nil {
			seen[link.Name] = map[int]bool{}
		}
		if seen[link.Name][link.Action] {
			return false
		}
		seen[link.Name][link.Action] = true
	}
	return len(script.TaskLinks) == 0 || script.TaskName == script.TaskLinks[0].Name
}

func validateCollection(collection *Collection) error {
	if collection == nil {
		return nil
	}
	if !required(collection.Root, 4096) || !timestamp(collection.StartedAt) || !timestamp(collection.CompletedAt) || !oneOf(collection.Status, "complete", "partial", "cancelled") || !oneOf(collection.TaskStatus, "complete", "partial", "unavailable", "not_applicable") || collection.ExaminedTasks < 0 || collection.ExaminedTasks > 5000 || len(collection.Issues) > 15 {
		return errors.New("수집 범위와 상태를 확인하세요")
	}
	start, _ := time.Parse(time.RFC3339, collection.StartedAt)
	end, _ := time.Parse(time.RFC3339, collection.CompletedAt)
	if end.Before(start) || (collection.TaskStatus == "not_applicable" && collection.ExaminedTasks != 0) || (collection.Status == "complete" && (!oneOf(collection.TaskStatus, "complete", "not_applicable") || len(collection.Issues) > 0)) {
		return errors.New("수집 상태와 시각이 일치하지 않습니다")
	}
	seen := map[string]bool{}
	for _, issue := range collection.Issues {
		if !ValidCollectionIssue(issue.Code) || seen[issue.Code] || issue.Count < 1 || issue.Count > 100000 {
			return errors.New("수집 제한과 부분 실패 정보를 확인하세요")
		}
		seen[issue.Code] = true
	}
	return nil
}
