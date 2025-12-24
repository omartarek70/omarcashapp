$link = 'C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Startup\ERP.lnk'
Write-Output "Link: $link"
Write-Output "Exists: $(Test-Path $link)"
if (Test-Path $link) {
  $w = New-Object -ComObject WScript.Shell
  $s = $w.CreateShortcut($link)
  Write-Output "Target: $($s.TargetPath)"
  Write-Output "WorkingDirectory: $($s.WorkingDirectory)"
  Write-Output "Icon: $($s.IconLocation)"
  try {
    Write-Output "Attempting to start target..."
    Start-Process -FilePath $s.TargetPath -WorkingDirectory $s.WorkingDirectory -PassThru | Select-Object Id,Path,ProcessName
  } catch {
    Write-Output "Start failed: $_"
  }
}
