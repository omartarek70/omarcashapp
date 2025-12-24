# Creates a shortcut in the current user's Startup folder pointing to the packaged ERP
param(
  [string]$TargetPath = "$PWD\dist_electron_packager\ERP-win32-x64\ERP.exe",
  [string]$LinkName = 'ERP.lnk'
)

Write-Host "Creating startup shortcut..."
if (-not (Test-Path $TargetPath)) {
  Write-Error "Target executable not found: $TargetPath"
  exit 1
}

$startup = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Startup'
$linkPath = Join-Path $startup $LinkName

$w = New-Object -ComObject WScript.Shell
$s = $w.CreateShortcut($linkPath)
$s.TargetPath = $TargetPath
$s.WorkingDirectory = Split-Path $TargetPath
$s.IconLocation = $TargetPath
$s.Save()

Write-Host "Shortcut created:" $linkPath
exit 0
