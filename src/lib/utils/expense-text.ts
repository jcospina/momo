/**
 * How the expense parser normalizes chat text before splitting it into
 * entries (lowercase, accents and punctuation stripped). Stored
 * `expenses.note` values are in this form, so the chat uses the same function
 * to find which part of the original message each expense came from.
 */
export function normalizeExpenseText(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^0-9a-z\s.,+]/g, '');
}
