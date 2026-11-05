# SignPath Foundation application draft

Prepared on 2026-11-05 against the fields on the official application form. Public project fields have been drafted in English. The account owner's name, email, consent and MFA status require the owner's input. [Application form](https://signpath.org/apply.html) · [Program conditions](https://signpath.org/terms.html)

| Form field | Value |
| --- | --- |
| Project Name | WinScript Doctor |
| Repository URL | https://github.com/chchlee/winscript-doctor |
| Homepage URL | https://github.com/chchlee/winscript-doctor/tree/codex/signpath-application |
| Download URL | https://github.com/chchlee/winscript-doctor/releases |
| Privacy Policy URL | https://github.com/chchlee/winscript-doctor/blob/codex/signpath-application/docs/privacy.md |
| Wikipedia URL | Leave blank |
| Category | Developer Tools |
| Maintainer Type | Individual maintainer(s) |
| Build System | GitHub Actions |
| First Name | Enter the account owner's first name |
| Last Name | Enter the account owner's last name |
| Email | Enter the owner's address for the SignPath account and notifications |
| Company Name | Leave blank for an individual application, or enter the actual organization |
| Primary Discovery Channel | AI / LLM tools |
| Exact source | ChatGPT, followed by review of the SignPath Foundation website and program conditions. |

The homepage field points to the application-preparation branch so reviewers can see the proposed policy alongside the current source. The repository root and published v0.1.0 release remain available at their standard URLs.

**Tagline**

> A desktop tool for inspecting automation script inventories and comparing execution environments.

**Description**

> WinScript Doctor helps system administrators understand and maintain existing automation scripts. It organizes local script files and their SHA-256 hashes, displays saved execution-context comparisons, and connects readable Windows Task Scheduler settings to the scripts they reference. Operators can also register a specific Windows SMB share and check access to a linked file. The application supports PowerShell, Batch, and Shell/Bash file inventories through a cross-platform desktop interface. Its purpose is to make existing automation easier to inspect and troubleshoot through read-only observations.

**Reputation**

> WinScript Doctor is an early-stage, MIT-licensed project maintained by the GitHub repository owner chchlee. The public repository was created on November 3, 2026, and the initial v0.1.0 desktop preview was published on November 4, 2026. Our current supporting evidence consists of public source history, documented functionality, downloadable release packages, and a public GitHub Actions workflow that builds and tests Windows x64, macOS Intel and Apple Silicon, and Linux x64 and ARM64 packages. We are applying for a reliable signing process as the project develops its user community. We understand that acceptance depends on the Foundation's review of project reputation and control.
>
> Repository and source history
> https://github.com/chchlee/winscript-doctor
>
> Initial public release
> https://github.com/chchlee/winscript-doctor/releases/tag/v0.1.0
>
> Successful native builds, tests and package verification
> https://github.com/chchlee/winscript-doctor/actions/runs/41962772771
>
> Proposed code signing policy and responsible maintainer
> https://github.com/chchlee/winscript-doctor/blob/codex/signpath-application/docs/code-signing.md

At preparation time, the public repository has zero stars and zero forks. The reputation text describes the available engineering evidence and the project's early stage. Approval is subject to SignPath's assessment.

The public v0.1.0 preview and draft v0.1.1 are separate. The requested Windows signing coverage is WinScriptDoctor.exe, the generated uninstaller and the NSIS Setup.exe. GitHub Actions integration with SignPath will be configured after account and project approval.

The owner must review the Foundation's Code of Conduct and the required personal-data processing consent before submitting. The newsletter checkbox is optional. MFA on GitHub and SignPath, defined signing roles, manual approval of signing requests and public signing/privacy policies are requirements of the program. These statements are requirements to verify, rather than assertions that account setup is complete.
