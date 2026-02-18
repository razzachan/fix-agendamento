param(
  [string]$BaseUrl = "https://api.fixfogoes.com.br",
  [string]$Phone = "+5599999999999"
)

$ErrorActionPreference = "Stop"

$token = $env:BOT_TOKEN
if ([string]::IsNullOrWhiteSpace($token)) {
  Write-Warning "BOT_TOKEN env var is not set. Token-protected endpoints will likely return 401."
}

function Invoke-HttpJson {
  param(
    [Parameter(Mandatory = $true)][ValidateSet('GET','POST','PUT','PATCH','DELETE')][string]$Method,
    [Parameter(Mandatory = $true)][string]$Url,
    [string]$BodyJson,
    [switch]$UseToken
  )

  $headers = @{ Accept = 'application/json' }
  if ($UseToken -and -not [string]::IsNullOrWhiteSpace($token)) {
    $headers['Authorization'] = "Bearer $token"
  }

  try {
    $resp = $null
    if ([string]::IsNullOrWhiteSpace($BodyJson)) {
      $resp = Invoke-WebRequest -Method $Method -Uri $Url -Headers $headers -UseBasicParsing
    } else {
      $utf8Body = [System.Text.Encoding]::UTF8.GetBytes($BodyJson)
      $resp = Invoke-WebRequest -Method $Method -Uri $Url -Headers $headers -ContentType 'application/json; charset=utf-8' -Body $utf8Body -UseBasicParsing
    }

    return [pscustomobject]@{
      Status = [int]$resp.StatusCode
      Body   = ($resp.Content | Out-String).Trim()
    }
  } catch {
    $ex = $_.Exception
    $status = 0
    $content = ''

    if ($ex.PSObject.Properties.Name -contains 'Response' -and $ex.Response) {
      try { $status = [int]$ex.Response.StatusCode.value__ } catch {}

      try {
        $stream = $ex.Response.GetResponseStream()
        if ($stream) {
          $reader = New-Object System.IO.StreamReader($stream)
          $content = $reader.ReadToEnd()
          $reader.Close()
        }
      } catch {}
    }

    if (-not $status) { $status = 500 }
    if ([string]::IsNullOrWhiteSpace($content)) { $content = ($ex.Message | Out-String).Trim() }

    return [pscustomobject]@{
      Status = $status
      Body   = ($content | Out-String).Trim()
    }
  }
}

function Print-Result {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)]$Result
  )

  Write-Host "== $Name =="
  Write-Host "Status: $($Result.Status)"
  if ($null -eq $Result.Body) {
    Write-Host "Body: <empty>"
  } elseif ($Result.Body.Length -gt 900) {
    Write-Host "Body (first 900 chars):"
    Write-Host $Result.Body.Substring(0, 900)
  } else {
    Write-Host "Body:"
    Write-Host $Result.Body
  }
  Write-Host ""
}

# 1) POST /api/leads/sync-from-bot (real insert/update)
$ts = (Get-Date).ToString('s')
$payload = @{
  phone = $Phone
  message = "SMOKE sync-from-bot $ts"
  state = @{
    orcamento_entregue = $true
  }
  extracted_data = @{
    equipment_type = "fogao"
    problem = "smoke test"
    urgency = "low"
    customer_name = "Smoke Test"
    address = "N/A"
  }
  note = "smoke test: created via sync-from-bot"
} | ConvertTo-Json -Depth 8 -Compress

$r1 = Invoke-HttpJson -Method "POST" -Url "$BaseUrl/api/leads/sync-from-bot" -BodyJson $payload -UseToken
Print-Result -Name "sync-from-bot" -Result $r1

$leadId = $null
try {
  $obj = $r1.Body | ConvertFrom-Json
  $leadId = $obj.lead_id
} catch {}

if ([string]::IsNullOrWhiteSpace($leadId)) {
  Write-Warning "No lead_id returned; skipping cleanup."
  exit 0
}

# 2) Cleanup: set crm_status=cancelado (final) so it doesn't stay in active funnel
$cleanupPayload = @{
  crm_status = "cancelado"
  notes = "smoke test cleanup"
} | ConvertTo-Json -Depth 4 -Compress

$r2 = Invoke-HttpJson -Method "PUT" -Url "$BaseUrl/api/leads/$leadId/status" -BodyJson $cleanupPayload -UseToken
Print-Result -Name "cleanup-status" -Result $r2
