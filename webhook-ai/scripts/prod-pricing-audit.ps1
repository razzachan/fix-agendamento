param(
  [string]$Base = 'https://webhook-ai-docker-production.up.railway.app'
)

$ErrorActionPreference = 'Stop'

if (-not $env:ADMIN_API_KEY) {
  throw 'ADMIN_API_KEY is missing (expected via `railway run -s webhook-ai-docker`).'
}

$headers = @{
  'x-admin-key' = $env:ADMIN_API_KEY
}

try {
  $resp = Invoke-RestMethod -Method GET -Uri "$Base/admin/pricing/audit" -Headers $headers -TimeoutSec 60
} catch {
  # Fallback for environments where Invoke-RestMethod behaves differently
  $raw = curl.exe -sS -m 60 -H "x-admin-key: $($env:ADMIN_API_KEY)" "$Base/admin/pricing/audit"
  $resp = $raw | ConvertFrom-Json
}

$missingTypes = @($resp.missing_types)
$missingDefaults = @($resp.missing_default_rules)

[pscustomobject]@{
  expected_count = $resp.expected_count
  configured_distinct_service_types = $resp.configured_distinct_service_types
  missing_types_count = $missingTypes.Count
  missing_types = $missingTypes
  missing_default_rules_count = $missingDefaults.Count
} | ConvertTo-Json -Depth 6
