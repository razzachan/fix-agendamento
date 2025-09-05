// Local fallback sem dependência externa
export type QuoteForm = {
  equipment: string;
  brand?: string;
  description?: string;
  segment?: string;
  problemCategory?: string;
};

export function computeLocalQuote(d: QuoteForm) {
  const base = 350;
  const segMul = /premium|inox/i.test(d.segment || '') ? 1.2 : 1.0;
  const value = Math.round(base * segMul);
  return {
    title: 'Orçamento estimado (coleta e diagnóstico)',
    priceLabel: `Estimativa: R$ ${value} (desconto 100% do diagnóstico se aprovar o serviço)`,
    value,
    min: value - 50,
    max: value + 150,
    details: [
      'Coleta e diagnóstico na bancada',
      'Transporte seguro e retorno instalado',
      'Se aprovar o serviço, o valor do diagnóstico é abatido 100%',
    ],
  };
}

export function buildLocalQuoteMessage(form: QuoteForm): string {
  const preview = computeLocalQuote(form);
  if (!preview) return 'Não consegui estimar o orçamento para este serviço.';
  const bullets = preview.details.map((d) => `- ${d}`).join('\n');
  const seg = form.segment ? `\nSegmento: ${form.segment}` : '';
  const prob = form.problemCategory ? `\nCategoria do problema: ${form.problemCategory}` : '';
  return `${preview.title}\n\n${preview.priceLabel}\n${seg}${prob}\n\n${bullets}\n\nDeseja agendar?`;
}
