package doctor

import "strings"

// CompareContexts reports observed differences. A changed row is not a causal
// claim, and an unobserved value can never count as an observed difference.
func CompareContexts(left, right ExecutionContext) ComparisonResult {
	result := ComparisonResult{Rows: make([]ComparisonRow, 0, 8)}
	add := func(key, label, a, b string, equal bool, note string) {
		row := ComparisonRow{Key: key, Label: label, Left: display(a), Right: display(b), Note: note}
		switch {
		case isUnknown(a) || isUnknown(b):
			row.Status = "unknown"
			row.Note = "한쪽 이상의 값이 미확인입니다. 같은 실행 계정과 조건에서 추가 수집이 필요합니다."
			result.UnknownCount++
		case equal:
			row.Status = "same"
			row.Note = "수집한 값이 일치합니다. 이 항목만으로 업무 실행의 성공을 보장하지 않습니다."
		default:
			row.Status = "changed"
			result.ChangeCount++
		}
		result.Rows = append(result.Rows, row)
	}
	add("account", "실행 계정", left.Account, right.Account, equalFold(left.Account, right.Account), "실행 계정의 차이를 관측했습니다. 대상 계정의 실제 접근 권한은 별도로 확인하세요.")
	add("logonType", "로그온 방식", left.LogonType, right.LogonType, equalFold(left.LogonType, right.LogonType), "로그온 방식의 차이를 관측했습니다. 해당 방식의 네트워크 접근 조건을 확인하세요.")
	add("engine", "실행 엔진", left.Engine, right.Engine, pathKey(left.Engine) == pathKey(right.Engine), "실행 파일의 차이를 관측했습니다. 버전과 호환성을 함께 확인하세요.")
	add("version", "엔진 버전", left.Version, right.Version, strings.TrimSpace(left.Version) == strings.TrimSpace(right.Version), "실행 엔진의 버전이 다릅니다. 스크립트와 모듈의 지원 버전을 확인하세요.")
	add("architecture", "프로세스 비트 수", left.Architecture, right.Architecture, equalFold(left.Architecture, right.Architecture), "프로세스 비트 수의 차이를 관측했습니다. 사용하는 모듈과 외부 프로그램을 확인하세요.")
	add("workingDirectory", "작업 폴더", left.WorkingDirectory, right.WorkingDirectory, pathKey(left.WorkingDirectory) == pathKey(right.WorkingDirectory), "작업 폴더가 다릅니다. 상대 경로 사용 여부를 확인하세요. 차이만으로 장애 원인을 확정하지 않습니다.")
	add("modulePaths", "모듈 검색 경로", strings.Join(left.ModulePaths, "\n"), strings.Join(right.ModulePaths, "\n"), equalPaths(left.ModulePaths, right.ModulePaths), "모듈 검색 경로나 우선순위가 다릅니다. 모듈 설치와 Import 성공 여부는 별도 확인이 필요합니다.")
	add("networkAccess", "네트워크 자원 접근", left.NetworkAccess, right.NetworkAccess, equalFold(left.NetworkAccess, right.NetworkAccess), "수집된 접근 결과가 다릅니다. 동일한 대상 자원과 계정으로 수집했는지 확인하세요.")
	return result
}

func equalFold(a, b string) bool {
	return strings.EqualFold(strings.TrimSpace(a), strings.TrimSpace(b))
}

// pathKey handles ordinary Windows paths even when tests run on a non-Windows
// host. It deliberately preserves drive-relative versus absolute paths and
// does not resolve symlinks, environment variables, or UPN/account aliases.
func pathKey(value string) string {
	p := strings.TrimSpace(value)
	if !strings.HasPrefix(p, `\\?\`) {
		p = strings.ReplaceAll(p, "/", `\`)
		if !(len(p) == 3 && p[1] == ':' && p[2] == '\\') {
			p = strings.TrimRight(p, `\`)
		}
	}
	return strings.ToLower(p)
}

func equalPaths(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for index := range a {
		if pathKey(a[index]) != pathKey(b[index]) {
			return false
		}
	}
	return true
}

func isUnknown(value string) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "", "미확인", "확인 불가", "수집되지 않음", "unknown", "not_collected", "unavailable", "not available", "n/a":
		return true
	default:
		return false
	}
}

func display(value string) string {
	if isUnknown(value) {
		return "미확인"
	}
	return value
}
