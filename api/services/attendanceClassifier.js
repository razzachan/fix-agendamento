// Heurística simples para determinar tipo de atendimento
// Retorna: 'em_domicilio' | 'coleta_diagnostico' | 'coleta_conserto'
export function classifyAttendance({ equipment_type, description='', attendance_preference='', urgency='' }={}){
  const txt = `${description} ${attendance_preference}`.toLowerCase();
  const eq = String(equipment_type||'').toLowerCase();

  // Preferência explícita do cliente
  if (/domic[íi]lio|em casa|ir at[ée]/.test(txt)) return 'em_domicilio';
  if (/retirar|coleta|levar para oficina|bancada/.test(txt)) {
    // distinguir diagnóstico x conserto
    if (/diagn[oó]stic|avaliar primeiro|or[çc]amento/.test(txt)) return 'coleta_diagnostico';
    return 'coleta_conserto';
  }

  // Por tipo de equipamento ou problema (heurísticas comuns)
  const benchKeywords = ['placa', 'placa eletr', 'solda', 'compressor', 'troc', 'motor', 'm[óo]dulo'];
  if (benchKeywords.some(k=>txt.includes(k))) return 'coleta_conserto';

  const diagKeywords = ['avaliar', 'diagnost', 'ver o que'];
  if (diagKeywords.some(k=>txt.includes(k))) return 'coleta_diagnostico';

  // Urgência pode influenciar domiciliar
  if (String(urgency).toLowerCase()==='urgente') return 'em_domicilio';

  // Defaults por equipamento (ajuste conforme negócio)
  if (['cooktop','microondas'].some(k=>eq.includes(k))) return 'coleta_diagnostico';
  if (['lava','lavar','secadora'].some(k=>eq.includes(k))) return 'em_domicilio';

  return 'em_domicilio';
}

export default { classifyAttendance };

