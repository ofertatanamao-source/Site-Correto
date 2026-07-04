/**
 * Shortens a product title to a maximum of 40 characters while preserving
 * the brand, product name and size/unit info.
 *
 * Strategy:
 * 1. Remove filler words and marketing fluff
 * 2. Keep brand name, core product name, variant/size
 * 3. Truncate gracefully at word boundary
 */

const FILLER_WORDS = [
  "profissional",
  "professional",
  "original",
  "genuíno",
  "kit",
  "com",
  "para",
  "de",
  "do",
  "da",
  "dos",
  "das",
  "em",
  "por",
  "e",
  "the",
  "with",
  "for",
];

const UNIT_PATTERN = /\b(\d+\s*(?:ml|l|g|kg|un|unidades?|pares?|pack|cx|caixa|fl oz|oz))\b/gi;

export function shortenTitle(title: string, maxLen = 40): string {
  if (title.length <= maxLen) return title;

  // Extract size/unit expressions to preserve them
  const units: string[] = [];
  const cleanedForUnits = title.replace(UNIT_PATTERN, (match) => {
    units.push(match.trim());
    return " ";
  });

  // Split into words and filter filler words
  const words = cleanedForUnits
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .filter((w) => !FILLER_WORDS.includes(w.toLowerCase()));

  // Build shortened title
  let result = "";
  for (const word of words) {
    const candidate = result ? `${result} ${word}` : word;
    if (candidate.length <= maxLen - (units.length ? units.join(" ").length + 1 : 0)) {
      result = candidate;
    } else {
      break;
    }
  }

  // Append units if they fit
  if (units.length > 0) {
    const unitStr = units.join(" ");
    const withUnits = `${result} ${unitStr}`.trim();
    if (withUnits.length <= maxLen) {
      result = withUnits;
    }
  }

  return result.trim() || title.substring(0, maxLen).trim();
}
