# Code signing policy

The maintainer has submitted an application to the SignPath Foundation open-source program. Approval and integration are pending. Windows packages in the v0.1.0 release are unsigned. The v0.1.1 release is a draft awaiting a publicly trusted Windows signing arrangement.

The repository owner, chchlee, maintains the source and release process. The proposed signing roles are recorded below for the application. SignPath account setup, MFA verification, approval and integration are pending.

| Proposed role | Responsible maintainer |
| --- | --- |
| Source authorship and review of external contributions | [chchlee](https://github.com/chchlee) |
| Signing and release approval | [chchlee](https://github.com/chchlee) |

The intended signing process uses artifacts produced from a recorded commit by the project's public GitHub Actions workflow. An authorized maintainer will review and approve each signing request. Before publication, release preparation will verify the Windows application's and installer's Authenticode signatures, timestamps, product name and version, and the checksums of uploaded assets. The generated Windows uninstaller is also part of the intended signing coverage.

Product metadata uses WinScript Doctor and the release's version. The automated workflow builds Windows x64, macOS Intel and Apple Silicon, and Linux x64 and ARM64 packages. SignPath is being considered for Windows Authenticode signing. [Build workflow](https://github.com/chchlee/winscript-doctor/blob/codex/release-v0.1.1/.github/workflows/desktop-build.yml)

If the SignPath Foundation accepts the application, this page and the download pages will identify the signing service and certificate publisher as required by the approved program. Users will be able to verify the publisher in the actual file signature. Approval and integration status will be updated after the Foundation's decision.

The software's local data handling, automatic GitHub update checks and user-requested SMB access are described in its privacy policy. [Privacy policy](privacy.md)
