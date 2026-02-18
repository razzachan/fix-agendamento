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
function SendMsg([string]$from, [string]$body) { PostJson '/test-message' @{ from = $from; body = $body } 240 }
function GetState([string]$from) { (PostJson '/test-session' @{ from = $from } 60).state }

$cases = @(
  @{ name = 'REPARO: Fogao piso 4 gas (nacional)'; from = 'whatsapp:+550000000201'; steps = @(
      'Fogao Brastemp de piso 4 bocas a gas. Nao acende duas bocas.',
      'E fogao de piso.',
      'Pode passar o orcamento do atendimento em domicilio?'
    ) },
  @{ name = 'REPARO: Fogao piso 5 gas (nacional)'; from = 'whatsapp:+550000000202'; steps = @(
      'Fogao Consul de piso 5 bocas a gas. Chamas fracas e nao acende direito.',
      'E fogao de piso.',
      'Quero o orcamento do atendimento em domicilio.'
    ) },
  @{ name = 'REPARO: Cooktop 5 gas (importado)'; from = 'whatsapp:+550000000203'; steps = @(
      'Cooktop 5 bocas a gas importado. Nao acende.',
      'E cooktop.',
      'Quero o orcamento do atendimento em domicilio.'
    ) },
  @{ name = 'REPARO: Coifa (domicilio)'; from = 'whatsapp:+550000000204'; steps = @(
      'Coifa Electrolux. Nao liga e esta fazendo barulho.',
      'Atendimento em domicilio. Quero o orcamento.'
    ) },
  @{ name = 'REPARO: Micro-ondas bancada (coleta conserto)'; from = 'whatsapp:+550000000205'; steps = @(
      'Micro-ondas LG de bancada. Nao esquenta e so gira.',
      'Quero o orcamento.'
    ) },
  @{ name = 'REPARO: Forno eletrico embutido (coleta diagnostico)'; from = 'whatsapp:+550000000206'; steps = @(
      'Forno eletrico embutido. Nao aquece.',
      'Marca Electrolux.',
      'Quero o orcamento.'
    ) },
  @{ name = 'INSTALACAO: Cooktop 4 gas'; from = 'whatsapp:+550000000207'; steps = @(
      'Quero instalar um cooktop 4 bocas a gas. Voces fazem instalacao?'
    ) },
  @{ name = 'GARANTIA: Pergunta vaga'; from = 'whatsapp:+550000000208'; steps = @(
      'Tenho garantia do servico?'
    ) },
  @{ name = 'HUMANO: Handoff'; from = 'whatsapp:+550000000209'; steps = @(
      'Quero falar com um atendente humano agora.'
    ) }
)

$results = @()

foreach ($c in $cases) {
  ResetSess $c.from
  StartSess $c.from
  $lastReply = $null
  foreach ($m in $c.steps) {
    $resp = SendMsg $c.from $m
    $lastReply = $resp.reply
  }

  $st = GetState $c.from
  $q = $st.last_quote

  $results += [pscustomobject]@{
    case = $c.name
    stage = $st.stage
    orcamento_entregue = [bool]$st.orcamento_entregue
    handoff_paused = [bool]$st.handoff_paused
    service_type = if ($q) { $q.service_type } else { $null }
    value = if ($q) { $q.value } else { $null }
    rule_id = if ($q) { $q.rule_id } else { $null }
    funnel = $st.funnel
    last_reply_preview = if ($lastReply) { ($lastReply | Out-String).Trim().Substring(0, [Math]::Min(160, (($lastReply | Out-String).Trim()).Length)) } else { $null }
  }
}

$results | ConvertTo-Json -Depth 8
