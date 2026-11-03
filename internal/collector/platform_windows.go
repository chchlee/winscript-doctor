//go:build windows

package collector

import (
	"context"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"os/user"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
	"time"

	"github.com/go-ole/go-ole"
	"github.com/go-ole/go-ole/oleutil"
	"golang.org/x/sys/windows"
	"winscriptdoctor/internal/doctor"
)

func Supported() bool { return true }
func isReparse(info fs.FileInfo) bool {
	if info.Mode()&fs.ModeSymlink != 0 {
		return true
	}
	attributes, ok := info.Sys().(*syscall.Win32FileAttributeData)
	return ok && attributes.FileAttributes&windows.FILE_ATTRIBUTE_REPARSE_POINT != 0
}

func CollectLocal(ctx context.Context, root string) (doctor.Workspace, error) {
	absolute, err := filepath.Abs(root)
	if err != nil || strings.HasPrefix(absolute, `\\`) {
		return doctor.Workspace{}, errors.New("네트워크 공유 대신 로컬 폴더를 선택하세요")
	}
	volume, err := windows.UTF16PtrFromString(filepath.VolumeName(absolute) + `\`)
	if err != nil || windows.GetDriveType(volume) != windows.DRIVE_FIXED {
		return doctor.Workspace{}, errors.New("일반 로컬 고정 디스크의 폴더를 선택하세요")
	}
	host := doctor.Host{Name: "미확인", OS: "Windows", Account: "미확인", Permission: "standard"}
	if name, err := os.Hostname(); err == nil && validText(name, 256) && name != "" {
		host.Name = name
	}
	if account, err := user.Current(); err == nil && validText(account.Username, 512) && account.Username != "" {
		host.Account = account.Username
	}
	version := windows.RtlGetVersion()
	if version != nil {
		host.OS = fmt.Sprintf("Windows %d.%d (build %d)", version.MajorVersion, version.MinorVersion, version.BuildNumber)
	}
	if windows.GetCurrentProcessToken().IsElevated() {
		host.Permission = "elevated"
	}
	return Collect(ctx, absolute, windowsTasks{}, host, DefaultLimits)
}

type windowsTasks struct{}

func (windowsTasks) Read(ctx context.Context, visit func(TaskAction)) (Inventory, error) {
	// Keep every COM object and callback on one fresh OS thread. No COM pointer
	// escapes this worker, including when cancellation is requested.
	type result struct {
		inventory Inventory
		err       error
	}
	done := make(chan result, 1)
	go func() {
		runtime.LockOSThread()
		defer runtime.UnlockOSThread()
		inventory, err := readTasks(ctx, visit)
		done <- result{inventory, err}
	}()
	read := <-done // Cancellation is checked between individual local COM calls.
	return read.inventory, read.err
}

func readTasks(ctx context.Context, visit func(TaskAction)) (Inventory, error) {
	var inventory Inventory
	err := ole.CoInitializeEx(0, ole.COINIT_MULTITHREADED)
	if err != nil {
		if code, ok := err.(*ole.OleError); !ok || code.Code() != 1 {
			return inventory, errors.New("예약 작업 조회를 초기화하지 못했습니다")
		}
	}
	defer ole.CoUninitialize()
	unknown, err := oleutil.CreateObject("Schedule.Service")
	if err != nil {
		return inventory, errors.New("예약 작업 서비스에 연결하지 못했습니다")
	}
	defer unknown.Release()
	service, err := unknown.QueryInterface(ole.IID_IDispatch)
	if err != nil {
		return inventory, errors.New("예약 작업 서비스를 읽지 못했습니다")
	}
	defer service.Release()
	connected, err := oleutil.CallMethod(service, "Connect")
	if err != nil {
		return inventory, errors.New("예약 작업 서비스에 연결하지 못했습니다")
	}
	connected.Clear()
	root, err := objectCall(service, "GetFolder", true, `\`)
	if err != nil {
		return inventory, errors.New("예약 작업 폴더를 읽지 못했습니다")
	}
	defer root.Release()
	folders := 0
	var walk func(*ole.IDispatch, int)
	walk = func(folder *ole.IDispatch, depth int) {
		if ctx.Err() != nil || inventory.Limited {
			return
		}
		folders++
		if folders > 512 || depth > 32 {
			inventory.Limited = true
			return
		}
		tasks, err := objectCall(folder, "GetTasks", true, 1) // Include hidden tasks the current account can read.
		if err != nil {
			inventory.Partial = true
		} else {
			count, countErr := intProperty(tasks, "Count")
			if countErr != nil {
				inventory.Partial = true
			}
			for i := 1; i <= count && ctx.Err() == nil; i++ {
				if inventory.Examined >= 5000 {
					inventory.Limited = true
					break
				}
				inventory.Examined++
				task, err := objectCall(tasks, "Item", false, i)
				if err != nil {
					inventory.Partial = true
					continue
				}
				if err := readTask(ctx, task, visit); err != nil {
					inventory.Partial = true
				}
				task.Release()
			}
			tasks.Release()
		}
		if ctx.Err() != nil || inventory.Limited {
			return
		}
		children, err := objectCall(folder, "GetFolders", true, 0)
		if err != nil {
			inventory.Partial = true
			return
		}
		defer children.Release()
		count, countErr := intProperty(children, "Count")
		if countErr != nil {
			inventory.Partial = true
			return
		}
		for i := 1; i <= count && ctx.Err() == nil && !inventory.Limited; i++ {
			child, err := objectCall(children, "Item", false, i)
			if err != nil {
				inventory.Partial = true
				continue
			}
			walk(child, depth+1)
			child.Release()
		}
	}
	walk(root, 0)
	return inventory, ctx.Err()
}

func objectCall(parent *ole.IDispatch, name string, method bool, args ...interface{}) (*ole.IDispatch, error) {
	var value *ole.VARIANT
	var err error
	if method {
		value, err = oleutil.CallMethod(parent, name, args...)
	} else {
		value, err = oleutil.GetProperty(parent, name, args...)
	}
	if err != nil {
		return nil, errors.New("예약 작업 속성을 읽지 못했습니다")
	}
	defer value.Clear()
	child := value.ToIDispatch()
	if child == nil {
		return nil, errors.New("예약 작업 속성의 형식을 확인하지 못했습니다")
	}
	child.AddRef()
	return child, nil
}

func stringProperty(object *ole.IDispatch, name string) (string, error) {
	value, err := oleutil.GetProperty(object, name)
	if err != nil {
		return "", errors.New("예약 작업 속성을 읽지 못했습니다")
	}
	defer value.Clear()
	if value.VT != ole.VT_BSTR && value.VT != ole.VT_EMPTY && value.VT != ole.VT_NULL {
		return "", errors.New("예약 작업 문자열을 읽지 못했습니다")
	}
	return value.ToString(), nil
}

func intProperty(object *ole.IDispatch, name string) (int, error) {
	value, err := oleutil.GetProperty(object, name)
	if err != nil {
		return 0, errors.New("예약 작업 숫자를 읽지 못했습니다")
	}
	defer value.Clear()
	switch value.VT {
	case ole.VT_I2, ole.VT_I4, ole.VT_UI4, ole.VT_INT, ole.VT_UINT:
		return int(value.Val), nil
	}
	return 0, errors.New("예약 작업 숫자의 형식을 확인하지 못했습니다")
}

func readTask(ctx context.Context, task *ole.IDispatch, visit func(TaskAction)) error {
	name, err := stringProperty(task, "Path")
	if err != nil {
		return err
	}
	definition, err := objectCall(task, "Definition", false)
	if err != nil {
		return err
	}
	defer definition.Release()
	principal, err := objectCall(definition, "Principal", false)
	if err != nil {
		return err
	}
	defer principal.Release()
	account, err := stringProperty(principal, "UserId")
	if err != nil {
		return err
	}
	if account == "" {
		account, err = stringProperty(principal, "GroupId")
		if err != nil {
			return err
		}
	}
	logon, err := intProperty(principal, "LogonType")
	if err != nil {
		return err
	}
	logons := []string{"None", "Password", "S4U", "InteractiveToken", "Group", "ServiceAccount", "InteractiveTokenOrPassword"}
	logonName := "미확인"
	if logon >= 0 && logon < len(logons) {
		logonName = logons[logon]
	}
	lastRun := ""
	date, dateErr := oleutil.GetProperty(task, "LastRunTime")
	if dateErr == nil {
		if parsed, ok := date.Value().(time.Time); ok && parsed.Year() >= 1970 {
			lastRun = time.Date(parsed.Year(), parsed.Month(), parsed.Day(), parsed.Hour(), parsed.Minute(), parsed.Second(), 0, time.Local).UTC().Format(time.RFC3339)
		}
		date.Clear()
	}
	lastResult := ""
	if result, err := intProperty(task, "LastTaskResult"); err == nil {
		lastResult = fmt.Sprintf("0x%08X", uint32(result))
	}
	actions, err := objectCall(definition, "Actions", false)
	if err != nil {
		return err
	}
	defer actions.Release()
	count, err := intProperty(actions, "Count")
	if err != nil || count > 32 {
		return errors.New("예약 작업 동작을 읽지 못했습니다")
	}
	for i := 1; i <= count && ctx.Err() == nil; i++ {
		action, err := objectCall(actions, "Item", false, i)
		if err != nil {
			return err
		}
		err = func() error {
			defer action.Release()
			kind, err := intProperty(action, "Type")
			if err != nil {
				return err
			}
			if kind != 0 {
				return nil
			}
			executable, err := stringProperty(action, "Path")
			if err != nil {
				return err
			}
			arguments, err := stringProperty(action, "Arguments")
			if err != nil {
				return err
			}
			working, err := stringProperty(action, "WorkingDirectory")
			if err != nil {
				return err
			}
			if len(arguments) > 32768 {
				return errors.New("예약 작업 인수 크기를 확인하세요")
			}
			visit(TaskAction{TaskLink: doctor.TaskLink{Name: name, Action: i, Executable: executable, WorkingDirectory: working, Account: account, LogonType: logonName, LastRunTime: lastRun, LastResult: lastResult}, arguments: arguments})
			return nil
		}()
		if err != nil {
			return err
		}
	}
	return ctx.Err()
}
