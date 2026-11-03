package doctor

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	"winscriptdoctor/fixtures"
)

const MaxSnapshotBytes = 2 * 1024 * 1024

// DemoWorkspace uses the exact same synthetic fixture as the frontend preview.
func DemoWorkspace() (Workspace, error) {
	return ParseWorkspace(fixtures.DemoJSON)
}

// ParseWorkspace accepts only the documented format. Error messages never echo
// imported field values, raw JSON, paths, or credentials back to the UI/logs.
func ParseWorkspace(raw []byte) (Workspace, error) {
	var workspace Workspace
	if len(raw) == 0 || len(raw) > MaxSnapshotBytes || !utf8.Valid(raw) {
		return Workspace{}, errors.New("스냅샷 크기 또는 문자 인코딩을 확인하세요")
	}
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&workspace); err != nil {
		return Workspace{}, errors.New("지원하는 스냅샷 JSON 형식과 필드만 가져올 수 있습니다")
	}
	if err := decoder.Decode(new(any)); err != io.EOF {
		return Workspace{}, errors.New("스냅샷에는 하나의 JSON 문서만 포함할 수 있습니다")
	}
	if err := validate(workspace); err != nil {
		return Workspace{}, err
	}
	// Keep successful bridge responses safe for array operations in the GUI.
	// Missing collections represent an empty result, not a failed import.
	if workspace.Scripts == nil {
		workspace.Scripts = []Script{}
	}
	if workspace.Findings == nil {
		workspace.Findings = []Finding{}
	}
	if workspace.Comparisons == nil {
		workspace.Comparisons = []ContextPair{}
	}
	for index := range workspace.Findings {
		if workspace.Findings[index].Evidence == nil {
			workspace.Findings[index].Evidence = []string{}
		}
	}
	for index := range workspace.Comparisons {
		if workspace.Comparisons[index].Manual.ModulePaths == nil {
			workspace.Comparisons[index].Manual.ModulePaths = []string{}
		}
		if workspace.Comparisons[index].Scheduled.ModulePaths == nil {
			workspace.Comparisons[index].Scheduled.ModulePaths = []string{}
		}
	}
	return workspace, nil
}

func validate(workspace Workspace) error {
	if err := validateCollection(workspace.Collection); err != nil {
		return err
	}
	if workspace.SchemaVersion != 1 && workspace.SchemaVersion != 2 {
		return errors.New("지원하지 않는 스냅샷 버전입니다")
	}
	if workspace.SchemaVersion == 1 && workspace.Collection != nil {
		return errors.New("수집 메타데이터에는 스냅샷 버전 2가 필요합니다")
	}
	if !required(workspace.ID, 128) || !required(workspace.Host.Name, 256) || !required(workspace.Host.OS, 256) || !required(workspace.Host.Account, 512) || !oneOf(workspace.Host.Permission, "standard", "elevated", "unknown") || !timestamp(workspace.Host.CollectedAt) {
		return errors.New("스냅샷과 호스트의 필수 정보를 확인하세요")
	}
	if len(workspace.Scripts) > 10000 || len(workspace.Findings) > 20000 || len(workspace.Comparisons) > 10000 {
		return errors.New("스냅샷에 포함된 항목 수가 제한을 초과했습니다")
	}
	scriptIDs, scriptTasks := map[string]bool{}, map[string]int{}
	scriptStatuses := map[string]string{}
	for _, script := range workspace.Scripts {
		if workspace.SchemaVersion == 1 && (script.SHA256 != "" || len(script.TaskLinks) > 0) {
			return errors.New("수집 메타데이터에는 스냅샷 버전 2가 필요합니다")
		}
		if !validScriptCollection(script) {
			return errors.New("파일 해시와 예약 작업 참조 정보를 확인하세요")
		}
		if !required(script.ID, 128) || scriptIDs[script.ID] || !required(script.Name, 512) || !required(script.Path, 4096) || !oneOf(script.Engine, "PowerShell", "Batch") || !oneOf(script.Status, "attention", "healthy", "unknown") || !text(script.TaskName, 512) || !text(script.Description, 8192) || !text(script.LastRun, 128) {
			return errors.New("스크립트의 필수 정보, 식별자 또는 상태를 확인하세요")
		}
		scriptIDs[script.ID] = true
		scriptStatuses[script.ID] = script.Status
		scriptTasks[script.Name+"\x00"+script.TaskName]++
	}
	findingIDs := map[string]bool{}
	for _, finding := range workspace.Findings {
		if !required(finding.ID, 128) || findingIDs[finding.ID] || !required(finding.RuleID, 128) || !required(finding.Title, 1024) || !required(finding.Explanation, 8192) || !required(finding.NextStep, 8192) || !scriptIDs[finding.ScriptID] || !oneOf(finding.Severity, "warning", "danger", "info") || !oneOf(finding.EvidenceState, "candidate", "observed", "unknown") || len(finding.Evidence) > 100 {
			return errors.New("진단의 필수 정보, 참조 또는 상태를 확인하세요")
		}
		if scriptStatuses[finding.ScriptID] == "healthy" && (finding.Severity != "info" || finding.EvidenceState != "observed") {
			return errors.New("스크립트 상태와 연결된 진단 결과가 일치하지 않습니다")
		}
		for _, evidence := range finding.Evidence {
			if !text(evidence, 8192) {
				return errors.New("진단 근거의 형식과 길이를 확인하세요")
			}
		}
		findingIDs[finding.ID] = true
	}
	pairIDs := map[string]bool{}
	for _, pair := range workspace.Comparisons {
		if !required(pair.ID, 128) || pairIDs[pair.ID] || !required(pair.TaskName, 512) || scriptTasks[pair.ScriptName+"\x00"+pair.TaskName] != 1 || !validContext(pair.Manual) || !validContext(pair.Scheduled) {
			return errors.New("환경 비교의 필수 정보 또는 스크립트 참조를 확인하세요")
		}
		pairIDs[pair.ID] = true
	}
	return nil
}

func validContext(context ExecutionContext) bool {
	if !required(context.Label, 256) || !required(context.CaptureMethod, 256) || !timestamp(context.CapturedAt) || len(context.ModulePaths) > 200 {
		return false
	}
	for _, value := range []string{context.Account, context.LogonType, context.Engine, context.Version, context.Architecture, context.WorkingDirectory, context.NetworkAccess} {
		if !text(value, 4096) {
			return false
		}
	}
	for _, path := range context.ModulePaths {
		if !text(path, 4096) {
			return false
		}
	}
	return true
}

func required(value string, maxBytes int) bool {
	return strings.TrimSpace(value) != "" && text(value, maxBytes)
}

func text(value string, maxBytes int) bool {
	if len(value) > maxBytes || !utf8.ValidString(value) {
		return false
	}
	for _, character := range value {
		if unicode.IsControl(character) && character != '\n' && character != '\t' && character != '\r' {
			return false
		}
	}
	return true
}

func timestamp(value string) bool {
	_, err := time.Parse(time.RFC3339, value)
	return err == nil
}

func oneOf(value string, allowed ...string) bool {
	for _, item := range allowed {
		if value == item {
			return true
		}
	}
	return false
}
