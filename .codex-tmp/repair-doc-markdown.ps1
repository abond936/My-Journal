# Repair malformed markdown: `**...**` inside inline code fences (not encoding).
$ErrorActionPreference = 'Stop'
$docsRoot = Join-Path $PSScriptRoot '..\docs'
$files = Get-ChildItem $docsRoot -Filter '*.md' -File | ForEach-Object { $_.FullName }

function Repair-Content([string]$content, [string]$path) {
  $name = Split-Path $path -Leaf

  # 02: rewrite meta lines that intentionally showed bad examples (preserve meaning).
  if ($name -eq '02-Application.md') {
    $content = $content -replace '- `\*\*📐` vs `⭕`:\*\* `📐` records', '- **📐 vs ⭕:** `📐` records'
    $content = $content -replace 'add an explicit `\*\*⭕1` / `⭕2\*\*` bullet', 'add an explicit **⭕1** / **⭕2** bullet'
    $content = $content -replace '- `\*\*✅` wording:\*\* Describe', '- **✅ wording:** Describe'
  }

  # `**inner**` -> `inner`
  $content = [regex]::Replace($content, '`\*\*([^`]+?)\*\*`', '`$1`')

  # `**inner` (opening ** only, closes at backtick) -> `inner`
  $content = [regex]::Replace($content, '`\*\*([^`]+?)`', '`$1`')

  # (`📐 **Title**`) -> (📐 **Title**)
  $content = [regex]::Replace($content, '\(`📐 \*\*([^)]+?)\*\*`\)', '(📐 **$1**)')

  # `📐 **Title**` -> 📐 **Title**
  $content = [regex]::Replace($content, '`📐 \*\*([^`]+?)\*\*`', '📐 **$1**')

  # Rare: backtick-bold route with trailing colon outside
  $content = $content -replace '`\*\*/view/\[id\]`:\*\*', '`/view/[id]`:'

  return $content
}

foreach ($file in $files) {
  $raw = [IO.File]::ReadAllText($file)
  $fixed = Repair-Content $raw $file
  if ($fixed -ne $raw) {
    [IO.File]::WriteAllText($file, $fixed, [System.Text.UTF8Encoding]::new($false))
    Write-Host "Updated: $(Split-Path $file -Leaf)"
  }
}

Write-Host 'Done.'
