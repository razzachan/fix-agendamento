export const RegionGroups = {
  A: ['Florianópolis','São José','Biguaçu','Palhoça'],
  B: ['Florianópolis','São José','Biguaçu','Palhoça'],
  C: ['Governador Celso Ramos','Tijucas','Itapema','Porto Belo','Bombas','Bombinhas','Camboriú','Balneário Camboriú','Itajaí','Navegantes']
};

export function inferGroupFromAddress(address=''){
  const txt = address.normalize('NFD').replace(/[^\p{L}\p{N}\s]/gu,'').toLowerCase();
  const check = (arr) => arr.some(c=> txt.includes(c.normalize('NFD').replace(/[^\p{L}\p{N}\s]/gu,'').toLowerCase()));
  if (check(RegionGroups.A)) return 'A';
  if (check(RegionGroups.B)) return 'B';
  if (check(RegionGroups.C)) return 'C';
  return null;
}

export default { RegionGroups, inferGroupFromAddress };

