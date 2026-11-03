//go:build windows

package collector

import (
	"context"
	"os"
	"testing"
	"time"
)

func TestNativeReadOnlyTaskEnumeration(t *testing.T) {
	if os.Getenv("WSD_NATIVE_COLLECTION_TEST") != "1" {
		t.Skip("opt-in read of this PC's task metadata")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	actions := 0
	inventory, err := (windowsTasks{}).Read(ctx, func(action TaskAction) {
		actions++
		if action.Name == "" || action.Action < 1 {
			t.Error("task reference metadata missing")
		}
	})
	if err != nil {
		t.Fatal(err)
	}
	if inventory.Examined == 0 || actions == 0 {
		t.Fatal("no native tasks or executable actions observed")
	}
	t.Logf("read-only enumeration: %d tasks, %d executable actions; partial=%v", inventory.Examined, actions, inventory.Partial)
}

func TestNativeLocalCollection(t *testing.T) {
	if os.Getenv("WSD_NATIVE_COLLECTION_TEST") != "1" {
		t.Skip("opt-in read of this PC's task metadata")
	}
	root := t.TempDir()
	writeScript(t, root, "synthetic.ps1", "Write-Output 'NEVER_EXECUTED'")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	workspace, err := CollectLocal(ctx, root)
	if err != nil {
		t.Fatal(err)
	}
	if len(workspace.Scripts) != 1 || workspace.Scripts[0].SHA256 == "" || workspace.Collection.ExaminedTasks == 0 || len(workspace.Comparisons) != 0 {
		t.Fatal("native collection metadata incomplete")
	}
	t.Logf("collected %d synthetic file and read %d tasks; status=%s", len(workspace.Scripts), workspace.Collection.ExaminedTasks, workspace.Collection.Status)
}
