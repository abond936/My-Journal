# Safe repair: only malformed `**...**` inside inline code fences.
$ErrorActionPreference = 'Stop'
$docsRoot = 'c:\Users\alanb\my-journal\docs'
$files = Get-ChildItem $docsRoot -Filter '*.md' -File | ForEach-Object { $_.FullName }

function Repair-Safe([string]$content, [string]$path) {
  $name = Split-Path $path -Leaf
  if ($name -eq '02-Application.md') {
    $content = $content -replace '- `\*\*📐` vs `⭕`:\*\* `📐` records', '- **📐 vs ⭕:** `📐` records'
    $content = $content -replace 'add an explicit `\*\*⭕1` / `⭕2\*\*` bullet', 'add an explicit **⭕1** / **⭕2** bullet'
    $content = $content -replace '- `\*\*✅` wording:\*\* Describe', '- **✅ wording:** Describe'
  }
  $content = [regex]::Replace($content, '`\*\*([^`]+?)\*\*`', '`$1`')
  $content = [regex]::Replace($content, '\(`📐 \*\*([^)]+?)\*\*`\)', '(📐 **$1**)')
  $content = [regex]::Replace($content, '`📐 \*\*([^`]+?)\*\*`', '📐 **$1**')
  $content = $content -replace '`\*\*/view/\[id\]`:\*\*', '`/view/[id]`:'
  return $content
}

foreach ($file in $files) {
  $raw = [IO.File]::ReadAllText($file)
  $fixed = Repair-Safe $raw $file
  if ($fixed -ne $raw) {
    [IO.File]::WriteAllText($file, $fixed, [System.Text.UTF8Encoding]::new($false))
    Write-Host "Safe: $(Split-Path $file -Leaf)"
  }
}
