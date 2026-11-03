package doctor

import (
	"bytes"
	"encoding/json"
	"reflect"
	"strings"
	"testing"
)

func TestSnapshotRoundTrip(t *testing.T) {
	workspace := demo(t)
	result, err := ParseWorkspace(encode(t, workspace))
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(workspace, result) {
		t.Fatal("snapshot lost observations during a JSON round trip")
	}
}

func TestSnapshotRejectsUnknownFieldsWithoutEchoingValues(t *testing.T) {
	for _, nested := range []bool{false, true} {
		workspace := demo(t)
		var object map[string]any
		if err := json.Unmarshal(encode(t, workspace), &object); err != nil {
			t.Fatal(err)
		}
		const secret = "SENTINEL_DO_NOT_ECHO_94da3a"
		if nested {
			object["host"].(map[string]any)["password"] = secret
		} else {
			object["credentials"] = map[string]any{"token": secret}
		}
		result, err := ParseWorkspace(encode(t, object))
		if err == nil || result.SchemaVersion != 0 {
			t.Fatal("unknown credential fields must reject the entire import")
		}
		if strings.Contains(err.Error(), secret) || strings.Contains(err.Error(), "password") || strings.Contains(err.Error(), "credentials") {
			t.Fatal("the import error echoed untrusted data")
		}
	}
}

func TestSnapshotRejectsInvalidReferencesAndStates(t *testing.T) {
	cases := []struct {
		name   string
		mutate func(*Workspace)
	}{
		{"unsupported schema", func(w *Workspace) { w.SchemaVersion = 2 }},
		{"duplicate script ID", func(w *Workspace) { w.Scripts[1].ID = w.Scripts[0].ID }},
		{"duplicate finding ID", func(w *Workspace) { w.Findings[1].ID = w.Findings[0].ID }},
		{"duplicate comparison ID", func(w *Workspace) { w.Comparisons[1].ID = w.Comparisons[0].ID }},
		{"unknown finding script", func(w *Workspace) { w.Findings[0].ScriptID = "missing" }},
		{"unknown comparison script", func(w *Workspace) { w.Comparisons[0].ScriptName = "missing.ps1" }},
		{"mismatched comparison task", func(w *Workspace) { w.Comparisons[0].TaskName = "DifferentTask" }},
		{"invalid script engine", func(w *Workspace) { w.Scripts[0].Engine = "Shell" }},
		{"invalid script status", func(w *Workspace) { w.Scripts[0].Status = "probably safe" }},
		{"invalid evidence state", func(w *Workspace) { w.Findings[0].EvidenceState = "certain cause" }},
		{"invalid severity", func(w *Workspace) { w.Findings[0].Severity = "urgent" }},
		{"invalid permission", func(w *Workspace) { w.Host.Permission = "admin maybe" }},
		{"invalid collection time", func(w *Workspace) { w.Host.CollectedAt = "yesterday" }},
		{"invalid capture time", func(w *Workspace) { w.Comparisons[0].Scheduled.CapturedAt = "" }},
		{"oversize field", func(w *Workspace) { w.Scripts[0].Path = strings.Repeat("a", 4097) }},
		{"control character", func(w *Workspace) { w.Scripts[0].Name = "bad\x00.ps1" }},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			workspace := demo(t)
			tc.mutate(&workspace)
			if result, err := ParseWorkspace(encode(t, workspace)); err == nil || result.SchemaVersion != 0 {
				t.Fatal("invalid input must return an error and no partially trusted workspace")
			}
		})
	}
}

func TestSnapshotRejectsMalformedAndOversizeInput(t *testing.T) {
	valid := encode(t, demo(t))
	cases := [][]byte{
		nil,
		[]byte("null"),
		[]byte("[{}]"),
		[]byte("{\"schemaVersion\":"),
		append(append([]byte(nil), valid...), []byte(" {}")...),
		append(append([]byte(nil), valid...), 'x'),
		bytes.Repeat([]byte(" "), MaxSnapshotBytes+1),
		[]byte{0xff, 0xfe},
	}
	for index, raw := range cases {
		if _, err := ParseWorkspace(raw); err == nil {
			t.Errorf("malformed case %d was accepted", index)
		}
	}
}

func TestUnknownContextObservationsRemainValidSnapshotData(t *testing.T) {
	workspace := demo(t)
	workspace.Comparisons[0].Scheduled.Account = ""
	workspace.Comparisons[0].Scheduled.ModulePaths = nil
	result, err := ParseWorkspace(encode(t, workspace))
	if err != nil {
		t.Fatalf("unobserved context fields are permitted: %v", err)
	}
	comparison := CompareContexts(result.Comparisons[0].Manual, result.Comparisons[0].Scheduled)
	if comparison.UnknownCount != 3 {
		t.Fatalf("account, module paths, and network must stay unknown: %d", comparison.UnknownCount)
	}
}

func TestEmptySnapshotCollectionsNormalizeForGUI(t *testing.T) {
	workspace := demo(t)
	workspace.Scripts = nil
	workspace.Findings = nil
	workspace.Comparisons = nil
	result, err := ParseWorkspace(encode(t, workspace))
	if err != nil {
		t.Fatal(err)
	}
	if result.Scripts == nil || result.Findings == nil || result.Comparisons == nil {
		t.Fatal("empty snapshots must expose arrays rather than null")
	}
	workspace = demo(t)
	workspace.Findings[0].Evidence = nil
	workspace.Comparisons[0].Manual.ModulePaths = nil
	result, err = ParseWorkspace(encode(t, workspace))
	if err != nil || result.Findings[0].Evidence == nil || result.Comparisons[0].Manual.ModulePaths == nil {
		t.Fatal("nested observation lists must normalize to empty arrays")
	}
}

func TestSnapshotRejectsAmbiguousComparisonTargets(t *testing.T) {
	workspace := demo(t)
	duplicate := workspace.Scripts[0]
	duplicate.ID = "another-backup"
	duplicate.Path = "E:/DifferentFolder/backup.ps1"
	workspace.Scripts = append(workspace.Scripts, duplicate)
	if _, err := ParseWorkspace(encode(t, workspace)); err == nil {
		t.Fatal("a comparison target must identify exactly one script")
	}
	// Repeated names in an inventory are valid when no comparison references
	// that ambiguous tuple. Inventory identity is the script ID, not its name.
	workspace.Comparisons = nil
	if _, err := ParseWorkspace(encode(t, workspace)); err != nil {
		t.Fatalf("unreferenced duplicate names should remain valid inventory: %v", err)
	}
}

func TestSnapshotAllowsSameScriptNameForDifferentTasks(t *testing.T) {
	workspace := demo(t)
	duplicate := workspace.Scripts[0]
	duplicate.ID = "different-task-backup"
	duplicate.TaskName = "DifferentBackup"
	duplicate.Path = "E:/DifferentFolder/backup.ps1"
	workspace.Scripts = append(workspace.Scripts, duplicate)
	if _, err := ParseWorkspace(encode(t, workspace)); err != nil {
		t.Fatalf("task and script name together identify the comparison: %v", err)
	}
}

func TestHealthyScriptAllowsOnlyObservedInformationalFindings(t *testing.T) {
	for _, severity := range []string{"info", "warning", "danger"} {
		for _, state := range []string{"observed", "candidate", "unknown"} {
			t.Run(severity+"/"+state, func(t *testing.T) {
				workspace := demo(t)
				workspace.Scripts[0].Status = "healthy"
				finding := workspace.Findings[0]
				finding.Severity = severity
				finding.EvidenceState = state
				workspace.Findings = []Finding{finding}
				_, err := ParseWorkspace(encode(t, workspace))
				allowed := severity == "info" && state == "observed"
				if allowed && err != nil {
					t.Fatalf("observed informational findings are allowed: %v", err)
				}
				if !allowed && err == nil {
					t.Fatal("a healthy status cannot contradict an actionable finding")
				}
			})
		}
	}
}

func demo(t *testing.T) Workspace {
	t.Helper()
	workspace, err := DemoWorkspace()
	if err != nil {
		t.Fatal(err)
	}
	return workspace
}

func encode(t *testing.T, value any) []byte {
	t.Helper()
	raw, err := json.Marshal(value)
	if err != nil {
		t.Fatal(err)
	}
	return raw
}
