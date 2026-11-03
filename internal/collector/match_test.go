package collector

import (
	"testing"
	"winscriptdoctor/internal/doctor"
)

func TestLiteralTaskReferences(t *testing.T) {
	for _, test := range []struct {
		name, exe, args, working, want string
		unresolved                     bool
	}{
		{"direct BAT", `D:\Ops\JOB.BAT`, `--token synthetic-only`, "", "d:/ops/job.bat", false},
		{"PowerShell file", `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`, `-NoProfile -ExecutionPolicy Bypass -File "D:\한글 폴더\job.ps1" -Token secret-only`, "", "d:/한글 폴더/job.ps1", false},
		{"relative explicit working", `pwsh.exe`, `-File ..\job.ps1`, `D:\Ops\sub`, "d:/ops/job.ps1", false},
		{"cmd outer quotes", `cmd.exe`, `/d /s /c ""D:\한글 폴더\job.cmd" arg"`, "", "d:/한글 폴더/job.cmd", false},
		{"cmd call", `cmd.exe`, `/c call "job.bat"`, `D:\Ops`, "d:/ops/job.bat", false},
		{"command expression", `pwsh.exe`, `-Command "& 'D:\Ops\job.ps1'"`, "", "", true},
		{"encoded", `powershell.exe`, `-EncodedCommand ZmFrZQ==`, "", "", true},
		{"dynamic environment", `powershell.exe`, `-File "%USERPROFILE%\job.ps1"`, "", "", true},
		{"relative missing base", `pwsh.exe`, `-File job.ps1`, "", "", true},
		{"drive relative", `pwsh.exe`, `-File D:job.ps1`, `D:\Ops`, "", true},
		{"root relative", `pwsh.exe`, `-File \Ops\job.ps1`, `D:\Ops`, "", true},
		{"cmd compound", `cmd.exe`, `/c D:\Ops\job.bat && echo private`, "", "", true},
		{"cmd expansion", `cmd.exe`, `/c "%ROOT%\job.bat"`, "", "", true},
		{"unclosed quote", `pwsh.exe`, `-File "D:\Ops\job.ps1`, "", "", true},
		{"lookalike option", `pwsh.exe`, `-FileName D:\Ops\job.ps1`, "", "", true},
		{"other executable", `backup.exe`, `-File D:\Ops\job.ps1`, "", "", false},
	} {
		t.Run(test.name, func(t *testing.T) {
			got, unresolved := directReference(TaskAction{TaskLink: doctor.TaskLink{Executable: test.exe, WorkingDirectory: test.working}, arguments: test.args})
			if got != test.want || unresolved != test.unresolved {
				t.Fatalf("got (%q,%v), want (%q,%v)", got, unresolved, test.want, test.unresolved)
			}
		})
	}
}
