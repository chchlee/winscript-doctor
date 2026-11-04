Unicode true
RequestExecutionLevel user
CRCCheck force
SetCompressor /SOLID lzma

!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "x64.nsh"
!include "WinVer.nsh"
!define APP_NAME "WinScript Doctor"
!define UNINSTALL_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\dev.winscriptdoctor.desktop"

Name "${APP_NAME}"
OutFile "WinScriptDoctorInstaller.exe"
InstallDir "$LOCALAPPDATA\Programs\${APP_NAME}"
VIProductVersion "${APP_VERSION}.0"
VIAddVersionKey "ProductName" "${APP_NAME}"
VIAddVersionKey "FileDescription" "${APP_NAME} Setup"
VIAddVersionKey "FileVersion" "${APP_VERSION}"
VIAddVersionKey "LegalCopyright" "WinScript Doctor contributors"
!define MUI_ICON "icon.ico"
!define MUI_UNICON "icon.ico"
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"
!insertmacro MUI_LANGUAGE "Korean"

LangString Unsupported ${LANG_ENGLISH} "WinScript Doctor requires 64-bit Intel/AMD Windows 10 or later."
LangString Unsupported ${LANG_KOREAN} "Intel/AMD 64비트 Windows 10 이상이 필요합니다."
LangString Collision ${LANG_ENGLISH} "An installation folder or Start menu entry already exists. Uninstall the previous copy or move the existing files before continuing."
LangString Collision ${LANG_KOREAN} "설치 폴더 또는 시작 메뉴 항목이 이미 있습니다. 이전 버전을 제거하거나 기존 파일을 옮긴 뒤 다시 실행하세요."
LangString WrongLocation ${LANG_ENGLISH} "Run this uninstaller from its registered installation folder."
LangString WrongLocation ${LANG_KOREAN} "등록된 설치 폴더에서 제거 프로그램을 실행하세요."
LangString InstallFailed ${LANG_ENGLISH} "Installation could not finish. Check write permissions and try again."
LangString InstallFailed ${LANG_KOREAN} "설치를 완료하지 못했습니다. 쓰기 권한을 확인하고 다시 시도하세요."
LangString RemoveFailed ${LANG_ENGLISH} "Removal could not finish. Close WinScript Doctor and try again."
LangString RemoveFailed ${LANG_KOREAN} "제거를 완료하지 못했습니다. WinScript Doctor를 닫고 다시 시도하세요."

Function .onInit
  SetShellVarContext current
  StrCpy $INSTDIR "$LOCALAPPDATA\Programs\${APP_NAME}"
  ${IfNot} ${IsNativeAMD64}
  ${OrIfNot} ${AtLeastWin10}
    MessageBox MB_OK|MB_ICONSTOP "$(Unsupported)" /SD IDOK
    SetErrorLevel 1
    Quit
  ${EndIf}
  ReadRegStr $0 HKCU "${UNINSTALL_KEY}" "InstallLocation"
  System::Call 'kernel32::GetFileAttributesW(w "$INSTDIR") i.r1'
  ${If} $0 != ""
  ${OrIf} $1 != -1
  ${OrIf} ${FileExists} "$SMPROGRAMS\${APP_NAME}.lnk"
    MessageBox MB_OK|MB_ICONSTOP "$(Collision)" /SD IDOK
    SetErrorLevel 1
    Quit
  ${EndIf}
FunctionEnd

!macro RemoveOwnedFiles
  Delete "$SMPROGRAMS\${APP_NAME}.lnk"
  Delete "$INSTDIR\Uninstall.exe"
  Delete "$INSTDIR\INSTALL.md"
  Delete "$INSTDIR\LICENSE"
  Delete "$INSTDIR\THIRD_PARTY_NOTICES.md"
  Delete "$INSTDIR\THIRD-PARTY-LICENSES.txt"
  Delete "$INSTDIR\LICENSES\shadcn-ui-MIT.txt"
  Delete "$INSTDIR\LICENSES\nsis.txt"
  RMDir "$INSTDIR\LICENSES"
  RMDir "$INSTDIR"
  DeleteRegKey HKCU "${UNINSTALL_KEY}"
!macroend

Section "WinScript Doctor"
  ClearErrors
  SetOutPath "$INSTDIR"
  File "payload\WinScriptDoctor.exe"
  File "payload\INSTALL.md"
  File "payload\LICENSE"
  File "payload\THIRD_PARTY_NOTICES.md"
  File "payload\THIRD-PARTY-LICENSES.txt"
  SetOutPath "$INSTDIR\LICENSES"
  File "payload\LICENSES\shadcn-ui-MIT.txt"
  File "payload\LICENSES\nsis.txt"
  SetOutPath "$INSTDIR"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  CreateShortcut "$SMPROGRAMS\${APP_NAME}.lnk" "$INSTDIR\WinScriptDoctor.exe"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayName" "${APP_NAME}"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayVersion" "${APP_VERSION}"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayIcon" "$INSTDIR\WinScriptDoctor.exe"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "UninstallString" '$\"$INSTDIR\Uninstall.exe$\"'
  WriteRegDWORD HKCU "${UNINSTALL_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINSTALL_KEY}" "NoRepair" 1
  IfErrors install_failed done
  install_failed:
    SetOutPath "$LOCALAPPDATA"
    Delete "$INSTDIR\WinScriptDoctor.exe"
    !insertmacro RemoveOwnedFiles
    MessageBox MB_OK|MB_ICONSTOP "$(InstallFailed)" /SD IDOK
    SetErrorLevel 1
    Quit
  done:
SectionEnd

Function un.onInit
  SetShellVarContext current
  ReadRegStr $0 HKCU "${UNINSTALL_KEY}" "InstallLocation"
  System::Call 'kernel32::GetFileAttributesW(w "$INSTDIR") i.r1'
  IntOp $2 $1 & 0x400
  ${If} $INSTDIR != "$LOCALAPPDATA\Programs\${APP_NAME}"
  ${OrIf} $0 != $INSTDIR
  ${OrIf} $1 == -1
  ${OrIf} $2 != 0
    MessageBox MB_OK|MB_ICONSTOP "$(WrongLocation)" /SD IDOK
    SetErrorLevel 1
    Quit
  ${EndIf}
FunctionEnd

Section "Uninstall"
  SetOutPath "$LOCALAPPDATA"
  ClearErrors
  Delete "$INSTDIR\WinScriptDoctor.exe"
  IfErrors remove_failed
  !insertmacro RemoveOwnedFiles
  Goto done
  remove_failed:
    MessageBox MB_OK|MB_ICONSTOP "$(RemoveFailed)" /SD IDOK
    SetErrorLevel 1
    Quit
  done:
SectionEnd
