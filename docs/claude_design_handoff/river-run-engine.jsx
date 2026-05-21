// river-run-engine.jsx — River Run solo mode game logic

const TARGET_CURVE = [45, 55, 70, 85, 105, 130, 160, 195];

// Upgrade shop items
const SHOP_ITEMS = [
  { id: 'double_vowel',  name: 'Vowel Amp',      cost: 4, desc: 'All vowels score ×2 this hand',     icon: 'A' },
  { id: 'length_boost',  name: 'Length Rush',     cost: 3, desc: 'Length bonuses are doubled',         icon: 'L' },
  { id: 'triple_wild',   name: 'Wild Tile',       cost: 5, desc: 'One tile becomes any letter',        icon: '?' },
  { id: 'credit_burst',  name: 'Credit Burst',    cost: 0, desc: 'Gain 4 credits immediately',         icon: '$' },
  { id: 'tile_flip',     name: 'Tile Upgrade',    cost: 3, desc: 'All ×1 tiles get ×2 this hand',      icon: '↑' },
  { id: 'combo_bonus',   name: 'Combo Chain',     cost: 4, desc: '+10 pts if all 3 phases are valid',  icon: '⚡' },
  { id: 'river_bonus',   name: 'River Surge',     cost: 3, desc: 'River phase scores ×1.5',            icon: '~' },
  { id: 'deal_extra',    name: 'Extra Deal',      cost: 5, desc: 'Deal phase reveals 5 tiles instead of 4', icon: '+' },
];

function getShopItems(seed = 0) {
  // Pick 3 random items from the pool
  const shuffled = [...SHOP_ITEMS].sort(() => Math.seededRandom(seed) - 0.5);
  return shuffled.slice(0, 3);
}

// Seeded random helper (simple LCG)
Math.seededRandom = function(seed) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
};

function rrLengthBonus(len, doubled = false) {
  const base = [0, 0, 0, 3, 6, 10, 15, 25][len] || 0;
  return doubled ? base * 2 : base;
}

function rrScoreWord(word, tiles, upgrades = []) {
  // Use validateWord from game-engine
  const assign = validateWord(word, tiles);
  if (!assign) return { valid: false, score: 0, breakdown: [], bonus: 0 };

  const doubleVowels = upgrades.includes('double_vowel');
  const lengthBoost  = upgrades.includes('length_boost');
  const tileFlip     = upgrades.includes('tile_flip');
  const VOWELS = new Set(['A','E','I','O','U']);

  let total = 0;
  const breakdown = assign.map(({ tile, chosen }) => {
    const base = valueOf(chosen);
    let mult = tile.mult;
    if (tileFlip && mult === 1) mult = 2;
    if (doubleVowels && VOWELS.has(chosen)) mult = (mult || 1) * 2;
    const final = base * mult;
    total += final;
    return { letter: chosen, base, mult, final };
  });

  const len = assign.length;
  const bonus = rrLengthBonus(len, lengthBoost);
  total += bonus;

  // full-7 bonus
  let fullBonus = 0;
  if (len === 7) { fullBonus = 10; total += 10; }

  return { valid: true, score: total, breakdown, bonus: bonus + fullBonus, word: word.toUpperCase() };
}

// ── Run state ────────────────────────────────────────────────────────
function newRiverRun() {
  return {
    state: 'active',   // active | shop | failed | completed
    handIndex: 0,      // 0-based index into TARGET_CURVE
    credits: 0,
    upgrades: [],      // active upgrades for current hand
    pendingUpgrades: [],// bought upgrades, apply next hand
    shopSeed: 0,
    // current hand
    hand: null,
  };
}

function rrStartHand(run) {
  const dealCount = run.pendingUpgrades.includes('deal_extra') ? 5 : 4;
  const allTiles = drawTiles(7, { choiceCount: Math.random() < 0.4 ? 1 : 0 });

  const upgrades = [...run.pendingUpgrades];

  // Wild tile: replace one tile with a wild (shows '?', can be any letter)
  let wildIdx = -1;
  if (upgrades.includes('triple_wild')) {
    wildIdx = Math.floor(Math.random() * 7);
    allTiles[wildIdx] = { ...allTiles[wildIdx], letter: '?', isWild: true, choiceAlt: null };
  }

  return {
    ...run,
    state: 'active',
    upgrades,
    pendingUpgrades: [],
    hand: {
      phase: 'deal',       // deal | turn | river
      tiles: allTiles,     // all 7 tiles (revealed progressively)
      revealed: dealCount, // how many are currently revealed
      dealCount,
      phaseWords: [],      // [{ phase, word, score, breakdown, bonus }]
      handTotal: 0,
      flippedThisPhase: false,
      wildChosen: wildIdx >= 0 ? { idx: wildIdx, letter: null } : null,
    },
  };
}

function rrAdvancePhase(run) {
  const h = run.hand;
  if (h.phase === 'deal') {
    return {
      ...run,
      hand: { ...h, phase: 'turn', revealed: 6, flippedThisPhase: false },
    };
  }
  if (h.phase === 'turn') {
    return {
      ...run,
      hand: { ...h, phase: 'river', revealed: 7, flippedThisPhase: false },
    };
  }
  return run; // shouldn't happen
}

function rrSubmitPhase(run, word, score, breakdown, bonus) {
  const h = run.hand;
  const phaseWords = [...h.phaseWords, { phase: h.phase, word, score, breakdown, bonus }];
  const handTotal = phaseWords.reduce((s, p) => s + p.score, 0);
  const updatedHand = { ...h, phaseWords, handTotal };

  const isCombo = run.upgrades.includes('combo_bonus')
    && phaseWords.length === 3
    && phaseWords.every(p => p.score > 0);

  let comboBonus = isCombo ? 10 : 0;

  if (h.phase === 'river') {
    // resolve hand
    const target = TARGET_CURVE[run.handIndex];
    const riverUpgrade = run.upgrades.includes('river_bonus');
    let finalScore = handTotal + comboBonus;
    if (riverUpgrade) {
      // the river phase score (last) gets ×1.5
      const riverPhaseScore = phaseWords[phaseWords.length - 1].score;
      finalScore = (handTotal - riverPhaseScore) + Math.round(riverPhaseScore * 1.5) + comboBonus;
    }

    // credit rewards
    let creditsEarned = 0;
    const used7 = word.length === 7;
    if (finalScore >= target) creditsEarned += 3;
    if (used7) creditsEarned += 2;

    const passed = finalScore >= target;
    const isLast = run.handIndex === TARGET_CURVE.length - 1;

    let nextState = 'active';
    if (!passed) nextState = 'failed';
    else if (isLast) nextState = 'completed';
    else nextState = 'shop';

    return {
      ...run,
      credits: run.credits + creditsEarned,
      state: nextState,
      handIndex: passed && !isLast ? run.handIndex + 1 : run.handIndex,
      shopSeed: run.shopSeed + 1,
      hand: {
        ...updatedHand,
        phase: 'done',
        handTotal: finalScore,
        comboBonus,
        creditsEarned,
        passed,
      },
    };
  }

  // advance phase
  const next = rrAdvancePhase({ ...run, hand: updatedHand });
  return next;
}

function rrSkipPhase(run) {
  // submit empty (score 0) for current phase
  return rrSubmitPhase(run, '', 0, [], 0);
}

function rrFlipTile(run, tileIdx) {
  const h = run.hand;
  if (h.flippedThisPhase) return run; // max 1 per phase
  if (run.credits < 2) return run;
  const tiles = h.tiles.map((t, i) => {
    if (i !== tileIdx) return t;
    // reroll
    let newLetter;
    do { newLetter = LETTER_BAG[Math.floor(Math.random() * LETTER_BAG.length)]; }
    while (newLetter === t.letter);
    return { ...t, letter: newLetter, choiceAlt: null };
  });
  return {
    ...run,
    credits: run.credits - 2,
    hand: { ...h, tiles, flippedThisPhase: true },
  };
}

function rrSetWild(run, letter) {
  const h = run.hand;
  if (!h.wildChosen) return run;
  const tiles = h.tiles.map((t, i) => {
    if (i !== h.wildChosen.idx) return t;
    return { ...t, letter, isWild: true };
  });
  return {
    ...run,
    hand: { ...h, tiles, wildChosen: { ...h.wildChosen, letter } },
  };
}

function rrBuyUpgrade(run, upgradeId) {
  const item = SHOP_ITEMS.find(x => x.id === upgradeId);
  if (!item) return run;
  if (item.cost > run.credits) return run;

  let credits = run.credits - item.cost;
  let pendingUpgrades = [...run.pendingUpgrades];

  if (upgradeId === 'credit_burst') {
    credits += 4; // immediate
  } else {
    pendingUpgrades.push(upgradeId);
  }

  return { ...run, credits, pendingUpgrades };
}

function rrRefreshShop(run) {
  if (run.credits < 2) return run;
  return { ...run, credits: run.credits - 2, shopSeed: run.shopSeed + 1 };
}

Object.assign(window, {
  TARGET_CURVE, SHOP_ITEMS, rrLengthBonus, rrScoreWord,
  newRiverRun, rrStartHand, rrAdvancePhase, rrSubmitPhase, rrSkipPhase,
  rrFlipTile, rrSetWild, rrBuyUpgrade, rrRefreshShop, getShopItems,
});
