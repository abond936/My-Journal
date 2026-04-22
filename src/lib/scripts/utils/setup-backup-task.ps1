# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "This script needs to be run as Administrator. Please right-click PowerShell and select 'Run as Administrator'."
    exit 1
}

# Repo root (this script lives in src/lib/scripts/utils)
$scriptDir = $PSScriptRoot
$projectRoot = $null
$gitOut = & git -C $scriptDir rev-parse --show-toplevel 2>$null
if ($LASTEXITCODE -eq 0 -and $gitOut) {
    $projectRoot = $gitOut.Trim()
}
if (-not $projectRoot) {
    $p = Get-Item $scriptDir
    $projectRoot = $p.Parent.Parent.Parent.Parent.FullName
}

# Create the task action
$action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -Command `"Set-Location -LiteralPath '$projectRoot'; npx ts-node src/lib/scripts/utils/backup-codebase.ts`""

# Create the trigger (run daily at 1 AM)
$trigger = New-ScheduledTaskTrigger -Daily -At 1AM

# Create the task settings
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd

# Create the task
$taskName = "MyJournal-CodebaseBackup"
$taskDescription = "Daily backup of repo-root secrets (.env, service account JSON); Git holds source code"

try {
    # Check if task already exists
    $existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($existingTask) {
        Write-Host "Removing existing task..."
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    }

    # Register the new task
    Write-Host "Creating new scheduled task..."
    Register-ScheduledTask -TaskName $taskName `
        -Description $taskDescription `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -User "SYSTEM" `
        -RunLevel Highest

    Write-Host "`nScheduled task '$taskName' has been created successfully."
    Write-Host "The backup will run daily at 1 AM."
    Write-Host "`nYou can verify the task in Task Scheduler (taskschd.msc)"
} catch {
    Write-Host "`nError creating scheduled task:"
    Write-Host $_.Exception.Message
    exit 1
} 