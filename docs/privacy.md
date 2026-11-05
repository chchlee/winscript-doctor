# Privacy policy

Effective date 2026-11-05. This policy covers the v0.1.1 source, including its GitHub update checks and Windows SMB file links.

WinScript Doctor processes selected script metadata, file hashes, imported snapshots and execution-context comparisons on the user's computer. On Windows, collection can include readable Task Scheduler settings. Snapshots can contain host names, account names, task names, paths and file hashes. Users choose where to export snapshots and who can access those files.

Theme and language preferences, skipped update versions, registered SMB aliases, share paths and script-file associations are saved in the desktop webview's local storage. SMB checks use the current Windows session, including credentials managed by Windows. The application stores the alias and paths rather than a separate SMB password.

The desktop application automatically checks the public GitHub Releases API shortly after startup. Users can also request a check from the toolbar. This HTTPS request identifies the application version in its User-Agent and exposes ordinary connection information, including the device's public IP address, to GitHub. The automatic check currently has no in-app off switch. Selecting a download opens the appropriate GitHub release asset in the user's browser. GitHub handles these requests under its privacy policy. [GitHub privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement)

An SMB connection test or server-file inspection contacts the server specified by the user. Windows applies its network authentication policy. The server can observe the connecting device and authenticated identity. The application reads the selected directory or file and displays the result locally. Connecting to a server is triggered by the user's test or inspection action.

Operational script contents, snapshots and Task Scheduler arguments are processed locally. The GitHub update request contains the release query and application version. Users can independently disclose snapshot data by choosing an export destination, sharing a file or posting it publicly.

The UI uses the operating system's WebView2 or WebKit runtime. Runtime-level settings and diagnostic data are governed by the runtime vendor and the user's OS configuration. [Microsoft privacy statement](https://privacy.microsoft.com/privacystatement)

The Windows installer provides an uninstaller. Its removal process preserves the application's user settings and user-created files. Users can remove saved preferences through the webview's site-data controls or their OS's application-data facilities. Exported snapshots remain at the destinations selected by the user.

Privacy questions can be raised with the repository owner, chchlee, through GitHub. Public issues should contain synthetic examples and omit operational data. [Project issues](https://github.com/chchlee/winscript-doctor/issues)
