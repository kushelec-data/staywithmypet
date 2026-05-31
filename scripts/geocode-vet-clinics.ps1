$ErrorActionPreference = "Stop"
$raw = Get-Content "$PSScriptRoot\vet-clinics-raw.json" -Raw | ConvertFrom-Json
$overrides = @{
  "miki animal clinic" = "Tallinn"
  "saue animal clinic" = "Saue"
}
$results = @()
$rows = $raw.sheetRows | Select-Object -Skip 1
foreach ($row in $rows) {
  $name = if ($null -ne $row[2]) { $row[2].ToString().Trim() } else { "" }
  if (-not $name) { continue }
  $city = if ($null -ne $row[1]) { $row[1].ToString().Trim() } else { "" }
  $address = if ($null -ne $row[3]) { $row[3].ToString().Trim() } else { "" }
  $key = $name.ToLower()
  if (-not $city -and $overrides.ContainsKey($key)) { $city = $overrides[$key] }
  $query = "$address, $city, Estonia"
  $uri = "https://nominatim.openstreetmap.org/search?q=" + [uri]::EscapeDataString($query) + "&format=json&limit=1&countrycodes=ee"
  $resp = Invoke-RestMethod -Uri $uri -Headers @{ "User-Agent" = "StayWithMyPet/1.0 (vet-audit)" }
  $lat = $null
  $lng = $null
  $display = $null
  if ($resp -and @($resp).Count -gt 0) {
    $lat = [double]$resp[0].lat
    $lng = [double]$resp[0].lon
    $display = $resp[0].display_name
  }
  Write-Host "$name -> $lat, $lng"
  $results += [PSCustomObject]@{ name = $name; city = $city; address = $address; query = $query; latitude = $lat; longitude = $lng; display_name = $display }
  Start-Sleep -Seconds 1.1
}
$out = Join-Path $PSScriptRoot "vet-clinics-geocoded.json"
$results | ConvertTo-Json -Depth 5 | Set-Content $out -Encoding utf8
Write-Host "Wrote $out ($($results.Count) clinics)"
