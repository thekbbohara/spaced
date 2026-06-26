// Cloze deletion: text with {{c1::answer}} or {{c1::answer::hint}} markers.
// In study the prompt hides the answer (showing the hint or […]) and the
// reveal shows the full text.
const CLOZE_RE = /\{\{c\d+::(.*?)(?:::(.*?))?\}\}/g;

export function isCloze(text: string): boolean {
  CLOZE_RE.lastIndex = 0;
  return CLOZE_RE.test(text);
}

// Prompt: every clozed span becomes its hint, or "[…]".
export function clozePrompt(text: string): string {
  return text.replace(CLOZE_RE, (_m, _answer, hint) => (hint ? `[${hint}]` : '[…]'));
}

// Answer: every clozed span becomes its answer text.
export function clozeAnswer(text: string): string {
  return text.replace(CLOZE_RE, (_m, answer) => answer);
}
