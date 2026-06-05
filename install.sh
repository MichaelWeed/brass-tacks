#!/bin/bash
set -e

# Setup colors
HEX_AMBER="\033[38;2;240;165;0m"
HEX_COBALT="\033[38;2;91;141;239m"
COLOR_RESET="\033[0m"
COLOR_BOLD="\033[1m"
COLOR_GREEN="\033[32m"
COLOR_RED="\033[31m"

echo -e "${HEX_AMBER}${COLOR_BOLD}"
echo "  ⚡──────────────────────────────────────────⚡"
echo "        BRASS TACKS LAUNCHER INSTALLATION     "
echo "  ⚡──────────────────────────────────────────⚡"
echo -e "${COLOR_RESET}"

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"

# Write path configuration to ~/.config/brasstacks/repo_path so the macOS wrapper can find this repository checkout
mkdir -p "$HOME/.config/brasstacks"
echo "$REPO_ROOT" > "$HOME/.config/brasstacks/repo_path"

OS_TYPE="$(uname -s)"

if [ "$OS_TYPE" = "Darwin" ]; then
    echo -e "${HEX_COBALT}🍏 macOS system detected.${COLOR_RESET}"
    
    # Target applications directory
    TARGET_DIR="$HOME/Applications"
    mkdir -p "$TARGET_DIR"
    
    echo "Installing BrassTacks.app to $TARGET_DIR..."
    rm -rf "$TARGET_DIR/BrassTacks.app"
    cp -R "$REPO_ROOT/launcher/macos/BrassTacks.app" "$TARGET_DIR/"
    chmod +x "$TARGET_DIR/BrassTacks.app/Contents/MacOS/BrassTacks"
    
    echo -e "${COLOR_GREEN}✓ BrassTacks.app installed successfully to $TARGET_DIR/BrassTacks.app${COLOR_RESET}"
    echo "You can now launch Brass Tacks using Spotlight or from your User Applications folder!"
    
elif [ "$OS_TYPE" = "Linux" ]; then
    echo -e "${HEX_COBALT}🐧 Linux system detected.${COLOR_RESET}"
    
    # Run Linux installer script
    "$REPO_ROOT/launcher/linux/install.sh"
    
else
    # Check if we are running in WSL
    if grep -qE "(Microsoft|microsoft-standard)" /proc/version 2> /dev/null; then
        echo -e "${HEX_COBALT}🪟 Windows (WSL) environment detected.${COLOR_RESET}"
        echo "Please execute launcher/windows/install.ps1 inside PowerShell (Administrator) on host Windows system"
        echo "to create desktop and Start Menu shortcuts."
    else
        echo -e "${COLOR_RED}❌ Unsupported operating system: $OS_TYPE${COLOR_RESET}"
        exit 1
    fi
fi

echo -e "\n${COLOR_GREEN}${COLOR_BOLD}🎉 Launcher installation complete!${COLOR_RESET}\n"
