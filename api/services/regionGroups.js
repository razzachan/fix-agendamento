export const RegionGroups = {
  // Centro/Ilha
  A: ['Florianópolis', 'Floripa'],
  // Continente próximo
  B: ['São José', 'Sao Jose', 'Biguaçu', 'Biguacu', 'Palhoça', 'Palhoca'],
  // Litoral / rota especial
  C: [
    'Governador Celso Ramos',
    'Tijucas',
    'Itapema',
    'Porto Belo',
    'Bombas',
    'Bombinhas',
    'Camboriú',
    'Camboriu',
    'Balneário Camboriú',
    'Balneario Camboriu',
    'Itajaí',
    'Itajai',
    'Navegantes',
    'Penha',
    'Piçarras',
    'Picarras',
  ]
};

export function inferGroupFromAddress(address=''){
  const txt = address.normalize('NFD').replace(/[^\p{L}\p{N}\s]/gu,'').toLowerCase();
  const check = (arr) => arr.some(c=> txt.includes(c.normalize('NFD').replace(/[^\p{L}\p{N}\s]/gu,'').toLowerCase()));
  // Grupo C deve ter precedência (override) quando houver qualquer pista de litoral.
  if (check(RegionGroups.C)) return 'C';
  if (check(RegionGroups.A)) return 'A';
  if (check(RegionGroups.B)) return 'B';
  return null;
}

export default { RegionGroups, inferGroupFromAddress };

