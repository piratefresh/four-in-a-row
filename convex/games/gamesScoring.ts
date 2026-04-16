const SPEED_BONUS_TIER_1_SECONDS = 5;
const SPEED_BONUS_TIER_2_SECONDS = 10;

function calculateLengthPoints(wordLength: number): number {
  return wordLength * 3;
}

function calculateSpeedBonus(
  submissionTime: number,
  showdownStartTime: number,
): number {
  const secondsElapsed = (submissionTime - showdownStartTime) / 1000;
  if (secondsElapsed <= SPEED_BONUS_TIER_1_SECONDS) return 10;
  if (secondsElapsed <= SPEED_BONUS_TIER_2_SECONDS) return 5;
  return 0;
}

export function calculateScore(
  word: string,
  submissionTime: number,
  stageStartTime: number,
) {
  const lengthPoints = calculateLengthPoints(word.length);
  const speedBonus = calculateSpeedBonus(submissionTime, stageStartTime);
  const validWordBonus = 5;

  return {
    lengthPoints,
    speedBonus,
    validWordBonus,
    total: lengthPoints + speedBonus + validWordBonus,
  };
}
