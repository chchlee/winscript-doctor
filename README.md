# WinScript Doctor

A lightweight desktop app for inspecting PowerShell, Batch and Shell/Bash files and comparing execution environments. Built with Go, Wails, React, TypeScript, Tailwind CSS and shadcn/ui.

[한국어](README.ko.md) · [Installation](docs/installation.md) · [Roadmap](docs/roadmap.md) · [Contributing](CONTRIBUTING.md)

[Code signing policy](docs/code-signing.md) · [Privacy policy](docs/privacy.md). The maintainer has submitted a SignPath application. Windows public signing awaits approval and integration.

## Current scope

The app provides an overview and an execution-context comparison screen using synthetic examples or saved JSON snapshots. Search and filters, evidence details, light/dark themes, JSON import/export, strict validation and native file dialogs are implemented. English is the default interface language. Open Settings → Language to select 한국어. Language and appearance preferences are saved on the current device.

Read-only collection on Windows, macOS and Linux inventories PS1, BAT, CMD, SH and BASH files and computes SHA-256 hashes. On Windows, native COM also associates literal PowerShell and Batch references from readable scheduled tasks. The Windows app can register SMB shares, test directory access and check the readability and hash of a linked file using the current Windows session. [Collection scope and limits](docs/collection.md)

Scheduled execution-context probes, call-graph analysis, baseline comparison and HTML reports remain planned. Task definitions are configuration observations, not captured runtime environments. This is an early prototype and does not modify existing scheduled tasks.

Unlike a job runner, the intended focus is explaining differences in existing Windows automation: account, logon type, engine, architecture, working directory and module search paths. Differences are observations, not proof of a failure's cause; uncollected values remain unknown.

![Overview with synthetic data](docs/screenshots/overview.png)

The interface uses shadcn/ui, Tailwind CSS semantic tokens and a neutral light/dark theme. Nanum Gothic is bundled locally under the SIL Open Font License 1.1. [Design system](docs/design-system.md)

## Platforms

| Platform                          | Package configuration                                 | Verification                                             |
| --------------------------------- | ----------------------------------------------------- | -------------------------------------------------------- |
| Windows amd64                     | Per-user Setup.exe or portable ZIP; WebView2 required | Installed and uninstalled on Windows 11                  |
| macOS 14+, Apple Silicon / Intel  | ZIP containing an ad-hoc signed .app                  | Native build, archive, signature and CPU checked         |
| Linux, Ubuntu 24.04+ / Debian 13+ | .deb and portable tar.gz with a user installer        | .deb installation verified on Ubuntu 24.04 x64 and ARM64 |

Linux uses GTK4 and WebKitGTK 6.0. End users do not need Go or Node. macOS public distribution signing and notarization are not implemented. macOS and Linux support local file inventories and saved snapshot comparisons. Windows also supports Task Scheduler references and user-selected SMB shares.

## Build from source

Install Go 1.27.3, Node 24 and the native libraries described in the [installation guide](docs/installation.md). macOS needs Xcode Command Line Tools; Linux needs build-essential, pkg-config, libgtk-4-dev and libwebkitgtk-6.0-dev on Ubuntu 24.04.

```sh
go install github.com/wailsapp/wails/v3/cmd/wails3@v3.1.0
# Ensure the Go bin directory is in PATH.
cd frontend
npm ci
cd ..
```

On Windows, run scripts/build.ps1 or scripts/dev.ps1 from PowerShell. On macOS/Linux:

```sh
sh scripts/build.sh
sh scripts/dev.sh
# Build and package for the current native OS:
sh scripts/package.sh
```

See [GitHub Releases](https://github.com/chchlee/winscript-doctor/releases) for downloads and the [installation guide](docs/installation.md) for exact filenames. For local Windows packaging use scripts/package.ps1. Packages and SHA256 checksums are written to bin/packages. For browser-only development, run npm run dev in frontend. For tests, follow [CONTRIBUTING.md](CONTRIBUTING.md). The GitHub Actions workflow uploads native build artifacts for review.

## Data and license

JSON snapshots support schemaVersion 1 and 2 with a 2 MiB limit. Existing v1 files remain readable; new collections use v2 for hashes, task links and collection scope. Older v1-only apps cannot open v2. Unknown fields and invalid references are rejected. See fixtures/demo-workspace.json and fixtures/collected-workspace.json for synthetic input. Raw task arguments and script source are not saved. Operational snapshots may contain internal host names, accounts and paths; keep them out of public issues and commits.

Project code is MIT licensed. See [third-party notices](THIRD_PARTY_NOTICES.md) for dependency notices.
