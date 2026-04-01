/**
 * Prompt template for German verb conjugation.
 * Returns structured JSON for Präsens, Präteritum, Perfekt, Konjunktiv II.
 */
export function buildConjugatePrompt(verb) {
  return {
    system: `You are a precise German grammar assistant. Always respond with valid JSON only — no explanations, no markdown fences, no extra text.`,
    user: `Conjugate the German verb "${verb}" and return ONLY a JSON object with this exact structure:

{
  "infinitive": "${verb}",
  "isReflexive": false,
  "auxiliary": "haben",
  "tenses": {
    "Präsens": {
      "ich": "...",
      "du": "...",
      "er/sie/es": "...",
      "wir": "...",
      "ihr": "...",
      "sie/Sie": "..."
    },
    "Präteritum": {
      "ich": "...",
      "du": "...",
      "er/sie/es": "...",
      "wir": "...",
      "ihr": "...",
      "sie/Sie": "..."
    },
    "Perfekt": {
      "ich": "...",
      "du": "...",
      "er/sie/es": "...",
      "wir": "...",
      "ihr": "...",
      "sie/Sie": "..."
    },
    "Konjunktiv II": {
      "ich": "...",
      "du": "...",
      "er/sie/es": "...",
      "wir": "...",
      "ihr": "...",
      "sie/Sie": "..."
    }
  }
}

Rules:
- auxiliary is "haben" or "sein"
- isReflexive is true if verb requires a reflexive pronoun
- Perfekt forms must include the full form: "ich habe gemacht" not just "gemacht"
- Return ONLY the JSON, nothing else.`,
  }
}
