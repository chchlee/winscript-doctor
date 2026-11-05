package collector

import (
	"path"
	"strings"
)

// Windows path comparison is independent of the OS running tests. No environment
// variables, shell expressions, shortcuts or symlinks are evaluated.
func windowsPath(value, working string) string {
	value = strings.TrimSpace(value)
	if len(value) >= 2 && value[0] == '"' && value[len(value)-1] == '"' {
		value = value[1 : len(value)-1]
	}
	if value == "" || strings.ContainsAny(value, "%$!`\x00\r\n\"") {
		return ""
	}
	p := strings.ReplaceAll(value, `\`, "/")
	abs := func(s string) bool {
		return len(s) >= 3 && ((s[0] >= 'A' && s[0] <= 'Z') || (s[0] >= 'a' && s[0] <= 'z')) && s[1] == ':' && s[2] == '/'
	}
	if !abs(p) {
		// Root-relative and drive-relative paths depend on unobserved process state.
		if strings.HasPrefix(p, "/") || strings.Contains(p, ":") {
			return ""
		}
		base := strings.ReplaceAll(working, `\`, "/")
		if !abs(base) || strings.ContainsAny(base, "%$!`\x00\r\n\"") {
			return ""
		}
		p = base + "/" + p
	}
	return strings.ToLower(path.Clean(p))
}

// argv implements Windows backslash/quote tokenization; an unclosed quote is
// rejected rather than guessed. It never interprets command text.
func argv(input string) ([]string, bool) {
	if len(input) > 32768 || strings.ContainsAny(input, "\x00\r\n") {
		return nil, false
	}
	var result []string
	for i := 0; i < len(input); {
		for i < len(input) && (input[i] == ' ' || input[i] == '\t') {
			i++
		}
		if i == len(input) {
			break
		}
		var word strings.Builder
		quoted := false
		for i < len(input) && (quoted || (input[i] != ' ' && input[i] != '\t')) {
			if input[i] == '\\' {
				start := i
				for i < len(input) && input[i] == '\\' {
					i++
				}
				n := i - start
				if i < len(input) && input[i] == '"' {
					word.WriteString(strings.Repeat(`\`, n/2))
					if n%2 == 1 {
						word.WriteByte('"')
						i++
						continue
					}
				} else {
					word.WriteString(strings.Repeat(`\`, n))
					continue
				}
			}
			if i < len(input) && input[i] == '"' {
				quoted = !quoted
				i++
				continue
			}
			if i < len(input) {
				word.WriteByte(input[i])
				i++
			}
		}
		if quoted {
			return nil, false
		}
		result = append(result, word.String())
		if len(result) > 256 {
			return nil, false
		}
	}
	return result, true
}

// directReference supports direct scripts, PowerShell -File and simple cmd /c.
// The bool distinguishes unsupported script-host expressions from other tasks.
func directReference(action TaskAction) (string, bool) {
	executable := strings.Trim(strings.TrimSpace(action.Executable), `"`)
	if engine := scriptEngine(executable); engine == "Batch" || engine == "PowerShell" {
		p := windowsPath(executable, action.WorkingDirectory)
		return p, p == ""
	}
	base := strings.ToLower(path.Base(strings.ReplaceAll(executable, `\`, "/")))
	if base != "powershell.exe" && base != "pwsh.exe" && base != "cmd.exe" {
		return "", false
	}
	tokens, ok := argv(action.arguments)
	if !ok {
		return "", true
	}
	if base != "cmd.exe" {
		for i, token := range tokens {
			switch strings.ToLower(token) {
			case "-command", "-c", "-encodedcommand", "-enc", "-e":
				return "", true
			case "-file":
				if i+1 >= len(tokens) || !strings.EqualFold(path.Ext(tokens[i+1]), ".ps1") {
					return "", true
				}
				p := windowsPath(tokens[i+1], action.WorkingDirectory)
				return p, p == ""
			}
		}
		return "", true
	}
	// cmd has additional expansion and metacharacter rules; only a deliberately
	// small literal subset is accepted, including its outer quote convention.
	if strings.ContainsAny(action.arguments, "&|<>^%!\r\n") {
		return "", true
	}
	args := strings.TrimSpace(action.arguments)
	for len(args) >= 3 && (strings.EqualFold(args[:3], "/d ") || strings.EqualFold(args[:3], "/s ")) {
		args = strings.TrimSpace(args[3:])
	}
	if len(args) < 3 || !strings.EqualFold(args[:3], "/c ") {
		return "", true
	}
	args = strings.TrimSpace(args[3:])
	if strings.HasPrefix(args, `""`) && strings.HasSuffix(args, `"`) {
		args = args[1 : len(args)-1]
	}
	tokens, ok = argv(args)
	if !ok || len(tokens) == 0 {
		return "", true
	}
	if strings.EqualFold(tokens[0], "call") {
		tokens = tokens[1:]
	}
	if len(tokens) == 0 || scriptEngine(tokens[0]) != "Batch" {
		return "", true
	}
	p := windowsPath(tokens[0], action.WorkingDirectory)
	return p, p == ""
}
