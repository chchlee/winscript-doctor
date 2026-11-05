package smb

import (
	"errors"

	"golang.org/x/sys/windows"
)

func accessError(err error) bool {
	return errors.Is(err, windows.ERROR_LOGON_FAILURE) ||
		errors.Is(err, windows.ERROR_INVALID_PASSWORD) ||
		errors.Is(err, windows.ERROR_ACCOUNT_RESTRICTION) ||
		errors.Is(err, windows.ERROR_SESSION_CREDENTIAL_CONFLICT)
}
