# One-time cleanup of duplicate menu data.
# Runs entirely through the PostgREST API with the anon key
# (RLS allows public writes), so no SQL editor access is needed.
#
# After this script:
#   - menu_categories: 8 rows -> 4 rows (one per name)
#   - menu_items:      36 rows -> 12 rows (one per name per category)
#   - stock_count:     0 -> -1 (meaning "not tracked / unlimited")
#   - is_available:    restored to TRUE for items only closed during debugging
#
# The DDL half (UNIQUE constraints, NULL-able stock_count) lives in
# 2026-10-23-menu-integrity.sql and must be run in the Supabase SQL editor.

$ErrorActionPreference = "Stop"

$envs = Get-Content .env.local
$url = ($envs | Select-String "NEXT_PUBLIC_SUPABASE_URL").ToString().Split("=")[1].Trim()
$key = ($envs | Select-String "NEXT_PUBLIC_SUPABASE_ANON_KEY").ToString().Split("=")[1].Trim()

$h = @{
  apikey = $key
  Authorization = "Bearer $key"
  "Content-Type" = "application/json"
  Prefer = "return=representation"
}

function Get-Table([string]$table, [string]$select = "*") {
  return Invoke-RestMethod -Uri "$url/rest/v1/$table`?select=$select" -Headers $h
}

function Patch-Table([string]$table, [string]$query, [hashtable]$body) {
  return Invoke-RestMethod -Method Patch -Uri "$url/rest/v1/$table`?$query" -Headers $h -Body ($body | ConvertTo-Json -Depth 5)
}

function Delete-Rows([string]$table, [string]$query) {
  return Invoke-RestMethod -Method Delete -Uri "$url/rest/v1/$table`?$query" -Headers $h
}

Write-Output "=== BEFORE ==="
$catsBefore = Get-Table "menu_categories"
$itemsBefore = Get-Table "menu_items"
Write-Output "categories: $($catsBefore.Count)  items: $($itemsBefore.Count)"

# 1) Dedupe categories: keep the lowest id per name
$catsByName = $catsBefore | Group-Object name
foreach ($group in $catsByName) {
  if ($group.Count -le 1) { continue }
  $sorted = $group.Group | Sort-Object id
  $keeper = $sorted[0].id
  foreach ($dup in ($sorted | Select-Object -Skip 1)) {
    Write-Output "  category '$($group.Name)': repointing items from $($dup.id) -> $keeper"
    Patch-Table "menu_items" "category_id=eq.$($dup.id)" @{ category_id = $keeper } | Out-Null
    Delete-Rows "menu_categories" "id=eq.$($dup.id)" | Out-Null
  }
}

# 2) Dedupe items: keep the lowest id per (category_id, name).
#    Repoint order_items first so history is preserved.
$itemsNow = Get-Table "menu_items"
$itemsByKey = $itemsNow | Group-Object { "$($_.category_id)|$($_.name)" }
foreach ($group in $itemsByKey) {
  if ($group.Count -le 1) { continue }
  $sorted = $group.Group | Sort-Object id
  $keeper = $sorted[0].id
  foreach ($dup in ($sorted | Select-Object -Skip 1)) {
    Write-Output "  item '$($dup.name)': repointing order_items from $($dup.id) -> $keeper"
    Patch-Table "order_items" "menu_item_id=eq.$($dup.id)" @{ menu_item_id = $keeper } | Out-Null
    Delete-Rows "menu_items" "id=eq.$($dup.id)" | Out-Null
  }
}

# 3) stock_count: 0 -> -1 (not tracked / unlimited).
#    -1 was the value the original code already documented as "no limit".
$zeroStock = Get-Table "menu_items" "id,stock_count" | Where-Object { $_.stock_count -eq 0 }
if ($zeroStock.Count -gt 0) {
  Write-Output "  setting stock_count = -1 on $($zeroStock.Count) items"
  foreach ($it in $zeroStock) {
    Patch-Table "menu_items" "id=eq.$($it.id)" @{ stock_count = -1 } | Out-Null
  }
}

# 4) Restore items closed only during the seed/debug window
#    (marked by the admin toggle but with no reason recorded).
$stale = Get-Table "menu_items" "id,name,unavailable_reason,marked_unavailable_by" |
  Where-Object { $null -eq $_.unavailable_reason -and $_.marked_unavailable_by -eq "⚙️ ผู้จัดการ" }
if ($stale.Count -gt 0) {
  Write-Output "  re-opening $($stale.Count) items closed during debugging"
  foreach ($it in $stale) {
    Patch-Table "menu_items" "id=eq.$($it.id)" @{
      is_available = $true
      unavailable_reason = $null
      marked_unavailable_at = $null
      marked_unavailable_by = $null
    } | Out-Null
  }
}

Write-Output ""
Write-Output "=== AFTER ==="
$catsAfter = Get-Table "menu_categories"
$itemsAfter = Get-Table "menu_items"
$ordersAfter = Get-Table "order_items" "id,menu_item_id"
Write-Output "categories: $($catsAfter.Count)  items: $($itemsAfter.Count)  order_items: $($ordersAfter.Count)"

$validIds = $itemsAfter.id
$orphans = @($ordersAfter | Where-Object { $validIds -notcontains $_.menu_item_id })
Write-Output "orphan order_items: $($orphans.Count)"

Write-Output "stock_count distribution:"
$itemsAfter | Group-Object stock_count | Select-Object Count, Name | Format-Table -AutoSize | Out-String | Write-Output

Write-Output "availability:"
$itemsAfter | Group-Object is_available | Select-Object Count, Name | Format-Table -AutoSize | Out-String | Write-Output

Write-Output "categories:"
$catsAfter | Sort-Object display_order | Select-Object name, id | Format-Table -AutoSize | Out-String | Write-Output
