#!/bin/bash
set -e

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DESKTOP_DIR="$HOME/.local/share/applications"
ICON_DIR="$HOME/.local/share/icons/hicolor/1024x1024/apps"

echo "🐧 Installing Linux Desktop Launcher..."

# Ensure target directories exist
mkdir -p "$DESKTOP_DIR"
mkdir -p "$ICON_DIR"

# Copy and replace path placeholder in desktop template
sed "s|__REPO_PATH__|$REPO_ROOT|g" "$REPO_ROOT/launcher/linux/brasstacks.desktop.template" > "$DESKTOP_DIR/brasstacks.desktop"
chmod +x "$DESKTOP_DIR/brasstacks.desktop"

# Copy Icon
cp "$REPO_ROOT/assets/icon.png" "$ICON_DIR/brasstacks.png"

# Update desktop database if tool is present
if command -v update-desktop-database &> /dev/null; then
    update-desktop-database "$HOME/.local/share/applications"
fi

echo "✓ Linux Desktop Entry installed successfully to $DESKTOP_DIR/brasstacks.desktop"
