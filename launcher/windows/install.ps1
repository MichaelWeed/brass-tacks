# PowerShell Script to create Brass Tacks Shortcuts on Windows
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = Resolve-Path "$ScriptDir\..\.."
$BatPath = "$RepoRoot\launcher\windows\BrassTacks.bat"
$IconPath = "$RepoRoot\assets\icon.png"

# Desktop Shortcut
$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath("Desktop")
$Shortcut = $WshShell.CreateShortcut("$DesktopPath\BrassTacks.lnk")
$Shortcut.TargetPath = $BatPath
$Shortcut.WorkingDirectory = "$RepoRoot"
$Shortcut.Description = "Local AI Resume Engineering Engine"
$Shortcut.Save()

# Start Menu Shortcut
$StartMenuPath = [System.Environment]::GetFolderPath("Programs")
$ShortcutSM = $WshShell.CreateShortcut("$StartMenuPath\BrassTacks.lnk")
$ShortcutSM.TargetPath = $BatPath
$ShortcutSM.WorkingDirectory = "$RepoRoot"
$ShortcutSM.Description = "Local AI Resume Engineering Engine"
$ShortcutSM.Save()

Write-Host "✓ Windows Shortcuts created successfully on Desktop and Start Menu!" -ForegroundColor Green
