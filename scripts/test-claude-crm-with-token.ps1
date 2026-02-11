param(
  [string]$BaseUrl = "https://api.fixfogoes.com.br",
  [string]$Phone = "+5548999999999",
  [string]$Date = (Get-Date).ToString("yyyy-MM-dd")
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
      # Windows PowerShell pode enviar string como UTF-16; envie bytes UTF-8 para evitar texto corrompido (ex.: "não" -> "nÃ£o").
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

    # PowerShell 5/7 differences: try to read status + response body from the exception
    if ($ex.PSObject.Properties.Name -contains 'Response' -and $ex.Response) {
      try {
        $status = [int]$ex.Response.StatusCode.value__
      } catch {}

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

# 1) POST /api/leads/from-claude
$leadPayload = @{
  phone = $Phone
  message = "Microondas não aquece"
  extracted_data = @{
    equipment_type = "microondas"
    problem = "não aquece"
    urgency = "high"
    customer_name = "Teste"
    address = "Rua X"
  }
} | ConvertTo-Json -Depth 6 -Compress

$r1 = Invoke-HttpJson -Method "POST" -Url "$BaseUrl/api/leads/from-claude" -BodyJson $leadPayload -UseToken
Print-Result -Name "from-claude" -Result $r1

# 2) GET /api/leads/pending
$r2 = Invoke-HttpJson -Method "GET" -Url "$BaseUrl/api/leads/pending" -UseToken
Print-Result -Name "pending" -Result $r2

# 3) POST /api/bot/tools/getAvailability
$availabilityPayload = @{
  date = $Date
  duration = 60
} | ConvertTo-Json -Depth 4 -Compress

$r3 = Invoke-HttpJson -Method "POST" -Url "$BaseUrl/api/bot/tools/getAvailability" -BodyJson $availabilityPayload -UseToken
Print-Result -Name "getAvailability" -Result $r3
