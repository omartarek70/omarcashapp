# Creates a shortcut in the All Users (ProgramData) Startup folder.
# Requires administrative privileges to write under C:\ProgramData.
param(
  [string]$TargetPath = "$PWD\dist_electron_packager\Cash App-win32-x64\Cash App.exe",
  [string]$LinkName = 'Cash App.lnk'
)

Write-Host "Creating All-Users startup shortcut..."
if (-not (Test-Path $TargetPath)) {
  Write-Error "Target executable not found: $TargetPath"
  exit 1
}

$startupAll = Join-Path ${env:ProgramData} 'Microsoft\Windows\Start Menu\Programs\Startup'
if (-not (Test-Path $startupAll)) {
  New-Item -ItemType Directory -Path $startupAll -Force | Out-Null
}

$linkPath = Join-Path $startupAll $LinkName

try {
  $w = New-Object -ComObject WScript.Shell
  $s = $w.CreateShortcut($linkPath)
  $s.TargetPath = $TargetPath
  $s.WorkingDirectory = Split-Path $TargetPath
  $s.IconLocation = $TargetPath
  $s.Save()
  Write-Host "Shortcut created:" $linkPath
  exit 0
} catch {
  Write-Error "Failed to create shortcut: $_"
  exit 2
}
