# This script must be run as Administrator

# Check if running as administrator
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Warning "This script requires Administrator privileges. Please re-run from an elevated PowerShell prompt."
    exit 1
}

# --- Configuration ---
$taskName = "MyJournal-DatabaseBackup"
$taskDescription = "Daily backup of MyJournal Firestore database."
$scriptToRun = "src\\lib\\scripts\\backup-database.ts"
$triggerTime = "2:00AM"
# --- End Configuration ---

# Get the project root directory relative to this script's location
$projectRoot = (Get-Item -Path "." -Verbose).FullName

$fullScriptPath = Join-Path -Path $projectRoot -ChildPath $scriptToRun

# Define the action to execute the TypeScript script via ts-node
$action = New-ScheduledTaskAction -Execute "npx" -Argument "ts-node -r tsconfig-paths/register -P tsconfig.scripts.json `"$fullScriptPath`"" -WorkingDirectory $projectRoot

# Define the trigger to run the task daily
$trigger = New-ScheduledTaskTrigger -Daily -At $triggerTime

# Define the settings for the task
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd

# Check for and remove an existing task with the same name before creating a new one
Write-Host "Checking for existing scheduled task '$taskName'..."
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "Task found. Removing existing task..."
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "Existing task removed."
}

# Register the new scheduled task
Write-Host "Creating new scheduled task '$taskName'..."
try {
    Register-ScheduledTask -TaskName $taskName `
        -Description $taskDescription `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -User "SYSTEM" `
        -RunLevel Highest
    
    Write-Host "`nSUCCESS: Scheduled task '$taskName' has been created successfully."
    Write-Host "The database backup will run daily at $triggerTime."
    Write-Host "You can view or manage this task in the Windows Task Scheduler (taskschd.msc)."
}
catch {
    Write-Error "Error creating scheduled task: $($_.Exception.Message)"
    exit 1
} 