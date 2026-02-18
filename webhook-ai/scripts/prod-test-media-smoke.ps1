$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $Root

$Url = 'https://webhook-ai-docker-production.up.railway.app/test-media'
$From = '5511999999999'

$Cats = @(
  'cooktop_basico',
  'cooktop_inox',
  'cooktop_premium'
)

$Results = @()
foreach ($c in $Cats) {
  $dir = Join-Path $Root ("public\\training-images\\fogoes\\$c")
  $file = Get-ChildItem $dir -File | Where-Object { $_.Name -match '\.(jpg|jpeg|png|webp)$' } | Select-Object -First 1
  if (-not $file) { throw "No image found for category: $c" }

  $bytes = [IO.File]::ReadAllBytes($file.FullName)
  $b64 = [Convert]::ToBase64String($bytes)

  $mime = switch -Regex ($file.Extension.ToLowerInvariant()) {
    '\.png' { 'image/png'; break }
    '\.webp' { 'image/webp'; break }
    default { 'image/jpeg' }
  }

  $payload = @{ from = $From; mimetype = $mime; base64 = $b64; caption = "smoke $c" } | ConvertTo-Json -Compress

  $resp = Invoke-RestMethod -Method Post -Uri $Url -ContentType 'application/json' -Body $payload -TimeoutSec 180

  $classification = $resp.classification

  $source = if ($resp.source) { $resp.source } elseif ($classification) { $classification.source } else { $null }
  $visualType = if ($resp.visual_type) { $resp.visual_type } elseif ($classification) { $classification.type } else { $null }
  $visualSegment = if ($resp.visual_segment) { $resp.visual_segment } elseif ($classification) { $classification.segment } else { $null }
  $visualConfidence = if ($resp.visual_confidence) { $resp.visual_confidence } elseif ($classification) { $classification.confidence } else { $null }
  $visualBurners = if ($resp.visual_burners) { $resp.visual_burners } elseif ($classification) { $classification.burners } else { $null }

  $Results += [pscustomobject]@{
    cat = $c
    file = $file.Name
    ok = [bool]$resp.ok
    source = $source
    visual_type = $visualType
    visual_segment = $visualSegment
    visual_confidence = $visualConfidence
    visual_burners = $visualBurners
  }
}

$Results | Format-Table -AutoSize
$Results | ConvertTo-Json -Depth 6
