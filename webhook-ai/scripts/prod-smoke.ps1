param(
  [string]$Base = 'https://webhook-ai-docker-production.up.railway.app'
)

$ErrorActionPreference = 'Stop'

function PostJson([string]$path, $obj, [int]$timeout=240) {
  $json = ($obj | ConvertTo-Json -Compress)
  $raw = $json | curl.exe -sS -m $timeout -X POST "$Base$path" -H 'Content-Type: application/json' --data-binary '@-'
  return $raw | ConvertFrom-Json
}

function ResetSess([string]$from) { PostJson '/sessions/reset' @{ peer = $from; channel = 'whatsapp' } 60 | Out-Null }
function StartSess([string]$from) { PostJson '/test-session' @{ from = $from } 60 | Out-Null }
function SendMsg([string]$from, [string]$body) { PostJson '/test-message' @{ from = $from; body = $body } 240 | Out-Null }
function GetState([string]$from) { (PostJson '/test-session' @{ from = $from } 60).state }

$cases = @(
  @{ name = 'Fogao piso 4'; from = 'whatsapp:+550000001301'; steps = @(
      'Fogao Brastemp de piso 4 bocas a gas. Nao acende duas bocas.',
      'E fogao de piso.',
      'Quero o orcamento do atendimento em domicilio.'
    ) },
  @{ name = 'Cooktop 5'; from = 'whatsapp:+550000001302'; steps = @(
      'Cooktop 5 bocas a gas importado. Nao acende.',
      'E cooktop.',
      'Marca Fischer.',
      'Quero o orcamento do atendimento em domicilio.'
    ) },
  @{ name = 'Coifa'; from = 'whatsapp:+550000001303'; steps = @(
      'Coifa Electrolux. Nao liga e esta fazendo barulho.',
      'Atendimento em domicilio. Quero o orcamento.'
    ) }
)

$out = foreach($c in $cases){
  ResetSess $c.from
  StartSess $c.from
  foreach($m in $c.steps){ SendMsg $c.from $m }
  $st = GetState $c.from
  $q = $st.last_quote

  [pscustomobject]@{
    case = $c.name
    stage = $st.stage
    orcamento_entregue = [bool]$st.orcamento_entregue
    handoff_paused = [bool]$st.handoff_paused
    service_type = if ($q) { $q.service_type } else { $null }
    value = if ($q) { $q.value } else { $null }
    rule_id = if ($q) { $q.rule_id } else { $null }
  }
}

$out | ConvertTo-Json -Depth 6
