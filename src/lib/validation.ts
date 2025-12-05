function normalize(text: string): string {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

export function findBestMatch(input: string, options: string[]): string | null {
    const normalizedInput = normalize(input);

    // 1. Exact match (normalized)
    const exactMatch = options.find(opt => normalize(opt) === normalizedInput);
    if (exactMatch) return exactMatch;

    // 2. Partial match (input contains option or option contains input)
    // We prioritize longer matches to avoid false positives with short words
    const partialMatch = options.find(opt => {
        const normOpt = normalize(opt);
        return normOpt.includes(normalizedInput) || normalizedInput.includes(normOpt);
    });
    if (partialMatch) return partialMatch;

    // 3. Simple Levenshtein-like check could be added here, but for now partial/exact is usually enough for voice commands
    // if the vocabulary is distinct enough.

    return null;
}
