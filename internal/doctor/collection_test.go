package doctor

import (
	"encoding/json"
	"os"
	"testing"
)

func collectionFixture(t *testing.T) Workspace {
	t.Helper()
	raw, err := os.ReadFile("../../fixtures/collected-workspace.json")
	if err != nil {
		t.Fatal(err)
	}
	w, err := ParseWorkspace(raw)
	if err != nil {
		t.Fatal(err)
	}
	return w
}

func TestCollectionSnapshotRoundTrip(t *testing.T) {
	w := collectionFixture(t)
	raw, _ := json.Marshal(w)
	reopened, err := ParseWorkspace(raw)
	if err != nil || len(reopened.Scripts[0].TaskLinks) != 2 || reopened.Scripts[0].SHA256 == "" || len(reopened.Collection.Issues) != 2 {
		t.Fatal("collection metadata lost", err)
	}
}

func TestRejectMalformedCollectionMetadata(t *testing.T) {
	for _, test := range []struct {
		name string
		edit func(*Workspace)
	}{
		{"metadata in old schema", func(w *Workspace) { w.SchemaVersion = 1 }},
		{"inconsistent completion", func(w *Workspace) { w.Collection.Status = "complete" }},
		{"reversed collection time", func(w *Workspace) { w.Collection.CompletedAt = "2026-11-03T09:00:00Z" }},
		{"invalid hash", func(w *Workspace) { w.Scripts[0].SHA256 = "not-a-hash" }},
		{"mismatched primary task", func(w *Workspace) { w.Scripts[0].TaskName = "other" }},
		{"duplicate action", func(w *Workspace) { w.Scripts[0].TaskLinks[1] = w.Scripts[0].TaskLinks[0] }},
		{"action index", func(w *Workspace) { w.Scripts[0].TaskLinks[0].Action = 0 }},
		{"result text", func(w *Workspace) { w.Scripts[0].TaskLinks[0].LastResult = "private-text" }},
		{"unknown issue", func(w *Workspace) { w.Collection.Issues[0].Code = "private-text" }},
		{"duplicate issue", func(w *Workspace) { w.Collection.Issues[1] = w.Collection.Issues[0] }},
		{"negative count", func(w *Workspace) { w.Collection.ExaminedTasks = -1 }},
	} {
		t.Run(test.name, func(t *testing.T) {
			w := collectionFixture(t)
			test.edit(&w)
			raw, _ := json.Marshal(w)
			if _, err := ParseWorkspace(raw); err == nil {
				t.Fatal("invalid collection accepted")
			}
		})
	}
}
