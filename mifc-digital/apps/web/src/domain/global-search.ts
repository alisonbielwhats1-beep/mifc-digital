export interface GlobalSearchDocument {
  id: string;
  type: string;
  label: string;
  description: string;
  keywords: string[];
  route: string;
  focus?: string;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function score(document: GlobalSearchDocument, normalizedQuery: string): number {
  const label = normalize(document.label);
  const description = normalize(document.description);
  const keywords = document.keywords.map(normalize);
  const haystack = [label, description, ...keywords].join(" ");
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  if (!terms.length || !terms.every((term) => haystack.includes(term))) return 0;
  if (label === normalizedQuery) return 120;
  if (label.startsWith(normalizedQuery)) return 100;
  if (label.includes(normalizedQuery)) return 85;
  if (keywords.some((keyword) => keyword === normalizedQuery)) return 70;
  if (keywords.some((keyword) => keyword.includes(normalizedQuery))) return 60;
  return 40;
}

export function searchGlobal(
  documents: GlobalSearchDocument[],
  query: string,
  limit = 10,
): GlobalSearchDocument[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return [];
  return documents
    .map((document) => ({ document, score: score(document, normalizedQuery) }))
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score || left.document.label.localeCompare(right.document.label, "pt-BR"))
    .slice(0, limit)
    .map((result) => result.document);
}
