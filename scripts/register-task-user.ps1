try {
  $exe = 'D:\omar\Omar tarek AUC\omar tarekqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq - Copy\cash-app\dist_electron_packager\ERP-win32-x64\ERP.exe'
  if (-not (Test-Path $exe)) {
    Write-Error "Target executable not found: $exe"
    exit 1
  }

  $action = New-ScheduledTaskAction -Execute $exe
  $trigger = New-ScheduledTaskTrigger -AtLogOn
  $taskName = 'ERP AutoStart (User)'

  # Register for the current user (no -User parameter)
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Force

  Write-Output "Task registered: $taskName"
  Get-ScheduledTask -TaskName $taskName | Format-List *
} catch {
  Write-Output "Failed to register task: $_"
  exit 2
}
