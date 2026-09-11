export const DRAFT_STORAGE_KEY = 'relgeo_editor_draft';
export const SELECTED_EXAMPLE_STORAGE_KEY = 'relgeo_selected_example';

type ExampleMap = Record<string, { code: string }>;

export function findExampleKeyByCode(
  code: string,
  examples: ExampleMap
): string | null {
  for (const [key, example] of Object.entries(examples)) {
    if (example.code === code) return key;
  }
  return null;
}

export function resolveInitialPlaygroundState(params: {
  defaultExampleKey: string;
  examples: ExampleMap;
  hashCode?: string | null;
  draftCode?: string | null;
  storedExampleKey?: string | null;
}): { code: string; selectedExample: string } {
  const {
    defaultExampleKey,
    examples,
    hashCode,
    draftCode,
    storedExampleKey,
  } = params;

  const fallbackExampleKey = examples[defaultExampleKey]
    ? defaultExampleKey
    : Object.keys(examples)[0];

  const preferredCode = hashCode || draftCode || examples[fallbackExampleKey].code;
  const matchedExampleKey = findExampleKeyByCode(preferredCode, examples);

  if (matchedExampleKey) {
    return { code: preferredCode, selectedExample: matchedExampleKey };
  }

  if (storedExampleKey && examples[storedExampleKey]) {
    return { code: preferredCode, selectedExample: storedExampleKey };
  }

  return { code: preferredCode, selectedExample: fallbackExampleKey };
}
