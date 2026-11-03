// Package fixtures contains synthetic examples shared by Go and the frontend.
package fixtures

import _ "embed"

//go:embed demo-workspace.json
var DemoJSON []byte
