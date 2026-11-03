//go:build !production

package main

import (
	"os"
	"strconv"
)

// Only development builds can opt into a local CDP port for UI verification.
func diagnosticBrowserArgs() []string {
	port, err := strconv.Atoi(os.Getenv("WSD_DEVTOOLS_PORT"))
	if err != nil || port < 1024 || port > 65535 {
		return nil
	}
	return []string{"--remote-debugging-port=" + strconv.Itoa(port), "--remote-debugging-address=127.0.0.1"}
}
