package doctor

import (
	"reflect"
	"testing"
)

func knownContext() ExecutionContext {
	return ExecutionContext{
		Account: `CONTOSO\svc_backup`, LogonType: "Password",
		Engine: `C:\Program Files\PowerShell\7\pwsh.exe`, Version: "7.6.3",
		Architecture: "x64", WorkingDirectory: `D:\Ops\Scripts`,
		ModulePaths:   []string{`D:\Ops\Modules`, `C:\Program Files\PowerShell\Modules`},
		NetworkAccess: "접근 확인",
	}
}

func TestCompareUnknownValuesAreNotObservedChanges(t *testing.T) {
	left, right := knownContext(), knownContext()
	right.Account = ""
	right.ModulePaths = nil
	right.NetworkAccess = "unknown"
	result := CompareContexts(left, right)
	if result.ChangeCount != 0 || result.UnknownCount != 3 {
		t.Fatalf("unknown values must stay unknown: changes=%d unknown=%d", result.ChangeCount, result.UnknownCount)
	}
	for _, key := range []string{"account", "modulePaths", "networkAccess"} {
		row := rowByKey(t, result, key)
		if row.Status != "unknown" || row.Right != "미확인" {
			t.Errorf("%s = %#v, want an unknown observation", key, row)
		}
	}
}

func TestCompareWindowsPathCaseAndOrdinarySeparators(t *testing.T) {
	left, right := knownContext(), knownContext()
	right.Account = `contoso\SVC_BACKUP`
	right.Engine = `c:/program files/powershell/7/PWSH.EXE`
	right.WorkingDirectory = `d:/ops/scripts/`
	right.ModulePaths = []string{`d:/ops/modules/`, `c:/program files/powershell/modules`}
	right.Architecture = "X64"
	result := CompareContexts(left, right)
	if result.ChangeCount != 0 || result.UnknownCount != 0 {
		t.Fatalf("equivalent ordinary Windows paths differ: %#v", result)
	}
}

func TestComparePreservesModuleSearchPriority(t *testing.T) {
	left, right := knownContext(), knownContext()
	right.ModulePaths = []string{left.ModulePaths[1], left.ModulePaths[0]}
	result := CompareContexts(left, right)
	if result.ChangeCount != 1 || rowByKey(t, result, "modulePaths").Status != "changed" {
		t.Fatalf("module search priority must remain significant: %#v", result)
	}
	if got := rowByKey(t, result, "modulePaths").Right; got != right.ModulePaths[0]+"\n"+right.ModulePaths[1] {
		t.Fatalf("display lost search order: %q", got)
	}
}

func TestCompareDoesNotCollapseDriveRelativeAndAbsolutePaths(t *testing.T) {
	left, right := knownContext(), knownContext()
	left.WorkingDirectory = `C:`
	right.WorkingDirectory = `C:\`
	result := CompareContexts(left, right)
	if result.ChangeCount != 1 || rowByKey(t, result, "workingDirectory").Status != "changed" {
		t.Fatalf("C: and C:\\ have different semantics: %#v", result)
	}
}

func TestCompareDoesNotMutateInputs(t *testing.T) {
	left, right := knownContext(), knownContext()
	beforeLeft := append([]string(nil), left.ModulePaths...)
	beforeRight := append([]string(nil), right.ModulePaths...)
	CompareContexts(left, right)
	if !reflect.DeepEqual(beforeLeft, left.ModulePaths) || !reflect.DeepEqual(beforeRight, right.ModulePaths) {
		t.Fatal("comparison mutated its input")
	}
}

func TestDemoHasExpectedObservations(t *testing.T) {
	workspace, err := DemoWorkspace()
	if err != nil {
		t.Fatal(err)
	}
	if !workspace.Demo || len(workspace.Scripts) != 6 || len(workspace.Findings) != 4 || len(workspace.Comparisons) != 2 {
		t.Fatalf("unexpected demo inventory: scripts=%d findings=%d pairs=%d", len(workspace.Scripts), len(workspace.Findings), len(workspace.Comparisons))
	}
	for index, expectation := range []struct{ changes, unknown int }{{6, 1}, {0, 0}} {
		pair := workspace.Comparisons[index]
		result := CompareContexts(pair.Manual, pair.Scheduled)
		if len(result.Rows) != 8 || result.ChangeCount != expectation.changes || result.UnknownCount != expectation.unknown {
			t.Errorf("pair %d: rows=%d changes=%d unknown=%d", index, len(result.Rows), result.ChangeCount, result.UnknownCount)
		}
	}
}

func rowByKey(t *testing.T, result ComparisonResult, key string) ComparisonRow {
	t.Helper()
	for _, row := range result.Rows {
		if row.Key == key {
			return row
		}
	}
	t.Fatalf("comparison row %q not found", key)
	return ComparisonRow{}
}
