# Publishing a signed desktop release

The Publish signed desktop release workflow publishes an existing draft after verifying all eight desktop packages and their SHA-256 files. Run it after the signed Windows Setup and portable ZIP have been attached to the draft. The Windows signing arrangement must be approved and configured before those packages can be produced. [Code signing policy](code-signing.md)

For v0.1.1, the source commit is 343cb8f2ff232d8321de668fa56283f904124517 and the successful native build run is 41962772771. The draft already contains the macOS and Linux packages from that build. The remaining assets are the signed Windows Setup, portable ZIP and their checksums.

1. Open Actions, select Publish signed desktop release and choose Run workflow.
2. Enter 0.1.1 and build run ID 41962772771.
3. Run the workflow. It verifies package hashes, source provenance for the macOS and Linux artifacts, Windows Authenticode signatures and timestamps, product metadata, and Windows installation and removal. The installed application's hash must match the signed application in the portable ZIP.

The verification job has read access. The publication job has write access and checks that the draft's commit and asset IDs, sizes and hashes match the verification record. That record expires after two hours. A failed check leaves the draft available for correction and another run.

The workflow runs the required signature checks before executing the installer. Its Windows installation test requires an isolated runner without an existing WinScript Doctor installation. Re-running publication of an already published release preserves it.

The source build's GitHub Actions artifacts must still be available. If they expire, rerun the native build on the release's source commit and use the new successful run ID.

The same verification and publication can be run locally in PowerShell 7 on an isolated Windows machine with repository access.

```powershell
.\scripts\publish-release.ps1 -Version 0.1.1 -BuildRunId 41962772771 -Publish
```

SignPath Foundation admission and approval of individual signing requests are separate service steps. This publication workflow finalizes packages after signing. The application's and generated uninstaller's signing integration will be configured with the approved SignPath project and artifact configuration.
