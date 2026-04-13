<#
.SYNOPSIS
  Pre-import folder checks: __X-marked image counts per folder (same rules as importFolderAsCard).

.DESCRIPTION
  - Walks all directories under -Root (including root).
  - Per folder: counts only files in that folder (non-recursive).
  - "__X" = basename ends with __X immediately before extension (uppercase X).
  - Reports: folders where __X count exceeds -MaxMarked; folders with any images but zero __X.

.PARAMETER Root
  Root folder to scan (default: OneDrive Pictures\zMomDadPics).

.PARAMETER MaxMarked
  Maximum allowed __X-marked images per folder (default: 30).

.PARAMETER OutFile
  If set, writes the same report to this path as UTF-8 (with BOM) for editors like Notepad.

.EXAMPLE
  .\tools\scan-import-prep.ps1
  .\tools\scan-import-prep.ps1 -Root 'D:\Photos\Batch1' -MaxMarked 30
  .\tools\scan-import-prep.ps1 -OutFile '.\tools\zMomDadPics-import-prep-report.txt'
#>
param(
  [string]$Root = 'C:\Users\alanb\OneDrive\Pictures\zMomDadPics',
  [int]$MaxMarked = 30,
  [string]$OutFile = ''
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $Root)) {
  Write-Error "Root not found: $Root"
  exit 1
}

$exts = @('.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif')

function Test-IsMarked([string]$name) {
  $base = [System.IO.Path]::GetFileName($name)
  $dot = $base.LastIndexOf('.')
  if ($dot -le 0) { return $false }
  $stem = $base.Substring(0, $dot)
  return $stem.EndsWith('__X')
}

function Test-IsImage([string]$name) {
  $e = [System.IO.Path]::GetExtension($name).ToLowerInvariant()
  return $exts -contains $e
}

$dirs = [System.Collections.Generic.List[string]]::new()
[void]$dirs.Add($Root)
Get-ChildItem -LiteralPath $Root -Directory -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
  [void]$dirs.Add($_.FullName)
}

$overMax = [System.Collections.Generic.List[object]]::new()
$noMarked = [System.Collections.Generic.List[string]]::new()
$foldersWithImages = 0

foreach ($d in $dirs) {
  $files = @(Get-ChildItem -LiteralPath $d -File -ErrorAction SilentlyContinue)
  $images = @($files | Where-Object { Test-IsImage $_.Name })
  if ($images.Count -eq 0) { continue }

  $foldersWithImages++
  $marked = @($images | Where-Object { Test-IsMarked $_.Name })
  $ti = $images.Count
  $tm = $marked.Count

  if ($tm -gt $MaxMarked) {
    [void]$overMax.Add([PSCustomObject]@{ Path = $d; Marked__X = $tm; TotalImages = $ti })
  }
  if ($tm -eq 0) {
    [void]$noMarked.Add($d)
  }
}

$report = [System.Collections.Generic.List[string]]::new()
function Add-ReportLine([string]$line) {
  [void]$report.Add($line)
  Write-Host $line
}

Add-ReportLine '=== Summary ==='
Add-ReportLine "Root: $Root"
Add-ReportLine "Folders with at least one image file (in folder only): $foldersWithImages"
Add-ReportLine "Max __X per folder (your rule): $MaxMarked"
Add-ReportLine ''
Add-ReportLine "=== A) More than $MaxMarked __X-marked images (split before one-card import) ==="
if ($overMax.Count -eq 0) {
  Add-ReportLine '(none)'
} else {
  $overMax | Sort-Object Marked__X -Descending | ForEach-Object {
    Add-ReportLine ('{0} __X, {1} non-__X images in folder | {2}' -f $_.Marked__X, ($_.TotalImages - $_.Marked__X), $_.Path)
  }
}
Add-ReportLine ''
Add-ReportLine '=== B) Has images but zero __X (rename / marker gap) ==='
if ($noMarked.Count -eq 0) {
  Add-ReportLine '(none)'
} else {
  $noMarked | Sort-Object | ForEach-Object { Add-ReportLine $_ }
}

if ($OutFile) {
  $dir = [System.IO.Path]::GetDirectoryName($OutFile)
  if ($dir -and -not (Test-Path -LiteralPath $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }
  $resolved = if ([System.IO.Path]::IsPathRooted($OutFile)) {
    $OutFile
  } else {
    [System.IO.Path]::GetFullPath((Join-Path (Get-Location).Path $OutFile))
  }
  $utf8Bom = New-Object System.Text.UTF8Encoding $true
  [System.IO.File]::WriteAllLines($resolved, $report.ToArray(), $utf8Bom)
  Write-Host ""
  Write-Host "Wrote $resolved"
}
