#!/bin/sh
# Install a prebuilt portable Linux bundle for the current user. No sudo, no
# runtime downloads, and no modification of shell profiles or operating data.
set -eu
if [ "$(uname -s)" != Linux ]; then
    printf '%s\n' '이 설치 스크립트는 Linux용입니다.' >&2
    exit 1
fi
BUNDLE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
DATA_HOME=${XDG_DATA_HOME:-"$HOME/.local/share"}
BIN_DIR="$HOME/.local/bin"
APP_DIR="$DATA_HOME/winscript-doctor"
MARKER="$APP_DIR/.installed-by-winscript-doctor"
ICON="$DATA_HOME/icons/hicolor/scalable/apps/dev.winscriptdoctor.desktop.svg"
DESKTOP="$DATA_HOME/applications/dev.winscriptdoctor.desktop.desktop"
collision() {
    printf '%s\n' '기존 파일과 충돌했습니다. 해당 파일을 보존하고 설치를 중단합니다.' >&2
    exit 1
}
if [ ! -f "$BUNDLE/winscript-doctor" ]; then
    printf '%s\n' '압축을 해제한 설치 패키지에서 실행하세요.' >&2
    exit 1
fi
if [ -L "$APP_DIR" ] || [ -L "$MARKER" ]; then
    collision
fi
OWNED=false
if [ -f "$MARKER" ] && [ "$(cat "$MARKER")" = 'winscript-doctor-user-install-v1' ]; then
    OWNED=true
fi
if [ -e "$APP_DIR" ] && { [ "$OWNED" != true ] || [ ! -d "$APP_DIR" ]; }; then
    collision
fi
# Check every destination before writing, including menu and icon collisions.
for TARGET_PATH in "$BIN_DIR/winscript-doctor" "$ICON" "$DESKTOP"; do
    if [ -L "$TARGET_PATH" ] ||
       { [ -e "$TARGET_PATH" ] && { [ "$OWNED" != true ] || [ ! -f "$TARGET_PATH" ]; }; }; then
        collision
    fi
done
mkdir -p "$BIN_DIR" "$APP_DIR" "$DATA_HOME/applications" "$DATA_HOME/icons/hicolor/scalable/apps"
install -m 755 "$BUNDLE/winscript-doctor" "$BIN_DIR/winscript-doctor"
install -m 644 "$BUNDLE/dev.winscriptdoctor.desktop.svg" "$ICON"
EXEC_PATH=$(printf '%s' "$BIN_DIR/winscript-doctor" | sed 's/\\/\\\\/g; s/"/\\"/g; s/`/\\`/g; s/\$/\\$/g; s/%/%%/g')
cat > "$DESKTOP" <<EOF
[Desktop Entry]
Type=Application
Name=WinScript Doctor
Comment=Windows script snapshot diagnostics
Exec="$EXEC_PATH"
Icon=dev.winscriptdoctor.desktop
Terminal=false
Categories=Development;System;
StartupNotify=true
EOF
chmod 644 "$DESKTOP"
printf '%s\n' 'winscript-doctor-user-install-v1' > "$MARKER"
if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database "$DATA_HOME/applications" || true
fi
printf '%s\n' "설치 완료: $BIN_DIR/winscript-doctor" '앱 메뉴에서 WinScript Doctor를 실행하세요.'
