package smb

import (
	"errors"
	"regexp"
	"strings"
	"unicode"
	"unicode/utf8"
)

var (
	errShare = errors.New("공유 경로를 \\\\서버\\공유 형식으로 입력하세요")
	errFile  = errors.New("공유 폴더 기준의 상대 파일 경로를 입력하세요")
	hostName = regexp.MustCompile(`^[A-Za-z0-9_](?:[A-Za-z0-9_.-]{0,251}[A-Za-z0-9_])?$`)
	device   = regexp.MustCompile(`(?i)^(?:CON|PRN|AUX|NUL|CONIN\$|CONOUT\$|(?:COM|LPT)[0-9¹²³])$`)
)

func validComponent(value string) bool {
	if value == "" || len(value) > 1020 || !utf8.ValidString(value) ||
		strings.ContainsAny(value, `<>:"/\|?*`) || strings.HasSuffix(value, ".") ||
		strings.TrimSpace(value) != value {
		return false
	}
	stem, _, _ := strings.Cut(value, ".")
	return !device.MatchString(strings.TrimSpace(stem)) &&
		strings.IndexFunc(value, func(r rune) bool { return unicode.IsControl(r) || unicode.Is(unicode.Cf, r) }) == -1
}

// SharePath parses ordinary SMB UNC paths only. No path cleaning may erase a
// component before validation.
func SharePath(value string) (string, error) {
	value = strings.ReplaceAll(value, "/", `\`)
	if len(value) < 5 || len(value) > 4096 || !strings.HasPrefix(value, `\\`) {
		return "", errShare
	}
	value = strings.TrimSuffix(value, `\`)
	parts := strings.Split(value[2:], `\`)
	if len(parts) < 2 || !hostName.MatchString(parts[0]) || strings.Contains(parts[0], "..") {
		return "", errShare
	}
	switch strings.ToUpper(parts[1]) {
	case "IPC$", "PRINT$", "DAVWWWROOT":
		return "", errShare
	}
	for _, part := range parts[1:] {
		if !validComponent(part) {
			return "", errShare
		}
	}
	return value, nil
}

func FilePath(value string) (string, error) {
	if len(value) > 4096 {
		return "", errFile
	}
	value = strings.ReplaceAll(value, "/", `\`)
	for _, part := range strings.Split(value, `\`) {
		if !validComponent(part) {
			return "", errFile
		}
	}
	return value, nil
}
