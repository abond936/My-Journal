#Requires -Version 5.1
<#
  Removes empty folders named xNormalized, yEdited, or zOriginals under -Root (recursive).
  Use -WhatIf to list candidates without deleting.
#>
param(
  [Parameter(Mandatory = $true)]
  [string] $Root,

  [switch] $WhatIf
)

$names = @('xNormalized', 'yEdited', 'zOriginals')
$allowed = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
foreach ($n in $names) { [void]$allowed.Add($n) }

if (-not (Test-Path -LiteralPath $Root)) {
  Write-Error "Root path does not exist: $Root"
  exit 1
}

$rootItem = Get-Item -LiteralPath $Root
if (-not $rootItem.PSIsContainer) {
  Write-Error "Root is not a directory: $Root"
  exit 1
}

# All matching directories; longest path first so nested cases delete safely (unusual for this layout)
$dirs = Get-ChildItem -LiteralPath $Root -Recurse -Directory -Force -ErrorAction SilentlyContinue |
  Where-Object { $allowed.Contains($_.Name) } |
  Sort-Object { $_.FullName.Length } -Descending

$removed = 0
$skipped = 0

foreach ($d in $dirs) {
  $any = Get-ChildItem -LiteralPath $d.FullName -Force -ErrorAction SilentlyContinue |
    Select-Object -First 1

  if ($null -ne $any) {
    $skipped++
    continue
  }

  if ($WhatIf) {
    Write-Host "[WhatIf] Would remove empty: $($d.FullName)"
    $removed++
    continue
  }

  try {
    Remove-Item -LiteralPath $d.FullName -Force -ErrorAction Stop
    Write-Host "Removed: $($d.FullName)"
    $removed++
  }
  catch {
    Write-Warning "Could not remove $($d.FullName): $($_.Exception.Message)"
  }
}

Write-Host ""
Write-Host "Done. Empty folders removed (or listed with -WhatIf): $removed  Non-empty skipped: $skipped"
