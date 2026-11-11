export function normalizeDefinitionPhrase(definition: string) {
  return definition
    .trim()
    .replace(/[.!?]+$/, '')
    .replace(/^(A|An|The)\s/, phrase => phrase.toLowerCase());
}
