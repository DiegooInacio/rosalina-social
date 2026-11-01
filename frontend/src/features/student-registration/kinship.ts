export const kinshipOptions = [
  'Mãe', 'Pai', 'Filha', 'Filho', 'Neta', 'Neto', 'Enteada', 'Enteado', 'Cônjuge', 'Companheira', 'Companheiro', 'Responsável', 'Avó', 'Avô', 'Bisavó', 'Bisavô', 'Tia', 'Tio',
  'Irmã', 'Irmão', 'Prima', 'Primo', 'Madrasta', 'Padrasto',
  'Madrinha', 'Padrinho', 'Tutora', 'Tutor', 'Responsável legal', 'Outro',
].map((label) => ({ value: label, label }))

const aliases: Record<string, string> = {
  ...Object.fromEntries(kinshipOptions.map(({ value }) => [value.toLocaleLowerCase('pt-BR'), value])),
  mae: 'Mãe', irma: 'Irmã', irmao: 'Irmão', 'responsavel legal': 'Responsável legal',
  outra: 'Outro', outros: 'Outro', outras: 'Outro',
}

export function normalizeKinship(value: string) {
  const trimmed = value.trim().replace(/\s+/g, ' ').normalize('NFC')
  // "avo" sem acento é ambíguo: preserva o registro para a pessoa conferir.
  const key = trimmed.toLocaleLowerCase('pt-BR')
  return Object.hasOwn(aliases, key) ? aliases[key] : trimmed
}
