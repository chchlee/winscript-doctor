//go:build !windows

package smb

func accessError(error) bool { return false }
