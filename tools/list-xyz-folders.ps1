#Requires -Version 5.1
<#
  Lists every folder named xNormalized, yEdited, or zOriginals under -Root (recursive).
  Default: one full path per line. Use -Tree for indented, tree-like output.
#>
param(
  [Parameter(Mandatory = $true)]
  [string] $Root,

  [switch] $Tree
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

$rootFull = $rootItem.FullName

$dirs = @(Get-ChildItem -LiteralPath $rootFull -Recurse -Directory -Force -ErrorAction SilentlyContinue |
  Where-Object { $allowed.Contains($_.Name) } |
  Sort-Object FullName)

if ($dirs.Count -eq 0) {
  Write-Host "No xNormalized, yEdited, or zOriginals folders under: $rootFull"
  exit 0
}

Write-Host "Found $($dirs.Count) folder(s) under: $rootFull"
Write-Host ""

if ($Tree) {
  foreach ($d in $dirs) {
    $rel = $d.FullName.Substring($rootFull.Length).TrimStart('\')
    $depth = if ([string]::IsNullOrEmpty($rel)) { 0 } else { ($rel -split '\\').Count - 1 }
    $indent = '  ' * $depth
    Write-Host ($indent + $d.Name + '  |  ' + $d.FullName)
  }
}
else {
  foreach ($d in $dirs) {
    Write-Host $d.FullName
  }
}
