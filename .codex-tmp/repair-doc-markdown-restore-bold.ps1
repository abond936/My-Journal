# Restore bold closers removed by overly aggressive pass2 (**: label endings).
$ErrorActionPreference = 'Stop'
$docsRoot = 'c:\Users\alanb\my-journal\docs'
$files = Get-ChildItem $docsRoot -Filter '*.md' -File | ForEach-Object { $_.FullName }

function Restore-Bold([string]$content) {
  # **Label: -> **Label:**
  $content = [regex]::Replace($content, '(\*\*[^*\r\n]+?)(:)(?!\*)', '$1**$2')
  return $content
}

foreach ($file in $files) {
  $raw = [IO.File]::ReadAllText($file)
  $fixed = Restore-Bold $raw
  if ($fixed -ne $raw) {
    [IO.File]::WriteAllText($file, $fixed, [System.Text.UTF8Encoding]::new($false))
    Write-Host "Restore: $(Split-Path $file -Leaf)"
  }
}
