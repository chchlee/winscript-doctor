// Package doctor defines the safe snapshot format and deterministic comparisons.
// It never runs the scripts represented by a snapshot.
package doctor

// Workspace is a bounded, explicitly versioned view of collected observations.
type Workspace struct {
	SchemaVersion int           `json:"schemaVersion"`
	ID            string        `json:"id"`
	Demo          bool          `json:"demo"`
	Host          Host          `json:"host"`
	Scripts       []Script      `json:"scripts"`
	Findings      []Finding     `json:"findings"`
	Comparisons   []ContextPair `json:"comparisons"`
	Collection    *Collection   `json:"collection,omitempty"`
}

type Host struct {
	Name        string `json:"name"`
	OS          string `json:"os"`
	Account     string `json:"account"`
	Permission  string `json:"permission"`
	CollectedAt string `json:"collectedAt"`
}

type Script struct {
	ID          string     `json:"id"`
	Name        string     `json:"name"`
	Path        string     `json:"path"`
	Engine      string     `json:"engine"`
	TaskName    string     `json:"taskName"`
	Status      string     `json:"status"`
	LastRun     string     `json:"lastRun"`
	Description string     `json:"description"`
	SHA256      string     `json:"sha256,omitempty"`
	TaskLinks   []TaskLink `json:"taskLinks,omitempty"`
}

// Collection records scope and gaps, never raw task arguments or script source.
type Collection struct {
	Root          string            `json:"root"`
	StartedAt     string            `json:"startedAt"`
	CompletedAt   string            `json:"completedAt"`
	Status        string            `json:"status"`
	TaskStatus    string            `json:"taskStatus"`
	ExaminedTasks int               `json:"examinedTasks"`
	Issues        []CollectionIssue `json:"issues"`
}

type CollectionIssue struct {
	Code  string `json:"code"`
	Count int    `json:"count"`
}

// TaskLink is an observed direct reference, not an observed execution context.
type TaskLink struct {
	Name             string `json:"name"`
	Action           int    `json:"action"`
	Executable       string `json:"executable"`
	WorkingDirectory string `json:"workingDirectory"`
	Account          string `json:"account"`
	LogonType        string `json:"logonType"`
	LastRunTime      string `json:"lastRunTime"`
	LastResult       string `json:"lastResult"`
}

type Finding struct {
	ID            string   `json:"id"`
	RuleID        string   `json:"ruleId"`
	Title         string   `json:"title"`
	Explanation   string   `json:"explanation"`
	ScriptID      string   `json:"scriptId"`
	Severity      string   `json:"severity"`
	EvidenceState string   `json:"evidenceState"`
	NextStep      string   `json:"nextStep"`
	Evidence      []string `json:"evidence"`
}

type ContextPair struct {
	ID         string           `json:"id"`
	TaskName   string           `json:"taskName"`
	ScriptName string           `json:"scriptName"`
	Manual     ExecutionContext `json:"manual"`
	Scheduled  ExecutionContext `json:"scheduled"`
}

// ExecutionContext contains observations only, not credentials or raw arguments.
// Empty values mean that a field was not observed, rather than a successful check.
type ExecutionContext struct {
	Label            string   `json:"label"`
	CaptureMethod    string   `json:"captureMethod"`
	CapturedAt       string   `json:"capturedAt"`
	Account          string   `json:"account"`
	LogonType        string   `json:"logonType"`
	Engine           string   `json:"engine"`
	Version          string   `json:"version"`
	Architecture     string   `json:"architecture"`
	WorkingDirectory string   `json:"workingDirectory"`
	ModulePaths      []string `json:"modulePaths"`
	NetworkAccess    string   `json:"networkAccess"`
}

type ComparisonResult struct {
	Rows         []ComparisonRow `json:"rows"`
	ChangeCount  int             `json:"changeCount"`
	UnknownCount int             `json:"unknownCount"`
}

type ComparisonRow struct {
	Key    string `json:"key"`
	Label  string `json:"label"`
	Left   string `json:"left"`
	Right  string `json:"right"`
	Status string `json:"status"`
	Note   string `json:"note"`
}
