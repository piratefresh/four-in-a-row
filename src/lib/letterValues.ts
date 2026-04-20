const LETTER_VALUES: Record<string, number> = {
  A: 1,
  B: 4,
  C: 4,
  D: 3,
  E: 1,
  F: 5,
  G: 3,
  H: 5,
  I: 1,
  J: 8,
  K: 5,
  L: 2,
  M: 4,
  N: 2,
  O: 1,
  P: 4,
  Q: 10,
  R: 2,
  S: 2,
  T: 2,
  U: 1,
  V: 5,
  W: 5,
  X: 8,
  Y: 5,
  Z: 10,
};

export function getLetterValue(letter?: string): number | undefined {
  if (!letter) return undefined;
  return LETTER_VALUES[letter.toUpperCase()] ?? 1;
}

export function getLetterValues(letters?: string[]): number[] | undefined {
  if (!letters) return undefined;
  return letters.map((letter) => getLetterValue(letter) ?? 1);
}
