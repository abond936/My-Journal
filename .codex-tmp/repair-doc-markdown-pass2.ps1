$ErrorActionPreference = 'Stop'
$docsRoot = 'c:\Users\alanb\my-journal\docs'
$files = Get-ChildItem $docsRoot -Filter '*.md' -File | ForEach-Object { $_.FullName }

function Repair-Pass2([string]$content) {
  # Leftover opening ** inside backticks: `**/path -> `/path
  $content = [regex]::Replace($content, '`\*\*/', '`/')

  # Stray ** immediately after a closed inline-code span
  $content = [regex]::Replace($content, '(`[^`]+)`\*\*', '$1`')

  # Stray ** glued to end of identifier/path before space/punct (no opening backtick)
  $content = [regex]::Replace($content, '([A-Za-z0-9_./:@-]+)\*\*(?=[\s\.,;\)\]:])', '$1')

  # Unclosed 📐 cite in backticks: (`📐 **Title`). -> (📐 **Title**).
  $content = [regex]::Replace($content, '\(`📐 \*\*([^)]+?)\)\.', '(📐 **$1**).')

  # (`📐 **Title`) missing closing paren before period
  $content = [regex]::Replace($content, '\(`📐 \*\*([^)]+?)\)\.', '(📐 **$1**).')

  # (`📐 **Title` at EOL or before punct without close
  $content = [regex]::Replace($content, '\(`📐 \*\*([^`.]+?)\)\.', '(📐 **$1**).')
  $content = [regex]::Replace($content, '\(`📐 \*\*([^`)]+?)\)', '(📐 **$1**)')

  # Broken: `**handleStudio...` / `patch...` -> `handle...` / `patch...`
  $content = [regex]::Replace($content, '`\*\*([^`]+?)`', '`$1`')

  # Broken split backticks: `**CardDimensionalTagCommandBar' `searchOnly`
  $content = $content -replace '`\*\*CardDimensionalTagCommandBar'' ``searchOnly`', '`CardDimensionalTagCommandBar` `searchOnly`'

  # zNA`** -> zNA`
  $content = $content -replace 'zNA`\*\*', 'zNA`'

  # Table cell: `--font-family-sans`**. -> `--font-family-sans`.
  $content = $content -replace '`--font-family-sans`''\*\*\.', '`--font-family-sans`.'

  return $content
}

foreach ($file in $files) {
  $raw = [IO.File]::ReadAllText($file)
  $fixed = Repair-Pass2 $raw
  if ($fixed -ne $raw) {
    [IO.File]::WriteAllText($file, $fixed, [System.Text.UTF8Encoding]::new($false))
    Write-Host "Pass2: $(Split-Path $file -Leaf)"
  }
}
