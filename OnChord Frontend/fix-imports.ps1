# Fix all versioned imports in UI components
$uiPath = "src\components\ui"
$files = Get-ChildItem -Path $uiPath -Filter "*.tsx"

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $updated = $content -replace '@[\d.]+(["\'])', '$1'
    
    if ($content -ne $updated) {
        Set-Content -Path $file.FullName -Value $updated -NoNewline:$false
        Write-Host "✓ Fixed: $($file.Name)"
    }
}

# Also fix lib files
$libPath = "src\lib"
$libFiles = Get-ChildItem -Path $libPath -Filter "*.tsx" -Recurse -ErrorAction SilentlyContinue
foreach ($file in $libFiles) {
    $content = Get-Content $file.FullName -Raw
    $updated = $content -replace '@[\d.]+(["\'])', '$1'
    
    if ($content -ne $updated) {
        Set-Content -Path $file.FullName -Value $updated
        Write-Host "✓ Fixed: $($file.FullName)"
    }
}

Write-Host "Import cleanup complete!"
