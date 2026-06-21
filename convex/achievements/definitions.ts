// ============================================================
// WORD POKER — COIN ECONOMY & ACHIEVEMENT TYPED DEFINITIONS
// ============================================================
// Runtime source of truth for all achievement/earn/store data.
// The JSONC at docs/wordpoker-achievements.jsonc remains the
// design reference. This file is the authoritative runtime source.
//
// CORE DESIGN RULE — TWO SEPARATE ECONOMIES, NEVER CONVERTIBLE:
//   "chips" = in-hand wagering currency (poker). Lives and dies inside a hand.
//   "coins" = meta progression currency. Earned by playing, spent on
//             cosmetics / coin-only entries. NEVER cashes out, NEVER becomes chips.
//   EXCEPTION: For balance (casual/practice) games, the old "coins never convert
//   to chips" rule is explicitly superseded — balance games may allow coin-to-chip
//   conversion en route to free entry games. Ranked/cash tables still enforce the firewall.
//   Keeping these firewalled in competitive play is what keeps this a skill game, not gambling.
// ============================================================

// ============================================================
// TRIGGER VOCABULARY
// ============================================================
export const TRIGGERS = [
  "REACHED_SHOWDOWN",
  "WON_HAND",
  "DAILY_LOGIN",
  "WORD_SUBMITTED",
  "USED_FULL_RACK",
  "DOUBLED_TILE_DECIDED_WIN",
  "USED_TWO_LETTER_TILE",
  "PLAYED_SPECIFIC_WORD",
  "ALL_IN_WIN",
  "RIVER_RAISE_WIN",
  "COMEBACK_WIN",
  "TOURNAMENT_ENTERED",
  "SNG_WON",
] as const;

export type Trigger = (typeof TRIGGERS)[number];

export const OPERATORS = [">=", "==", "<", "matches"] as const;

export type Operator = (typeof OPERATORS)[number];

export const ACHIEVEMENT_CATEGORIES = [
  "wordcraft",
  "poker",
  "progression",
  "hidden",
] as const;

export type AchievementCategory = (typeof ACHIEVEMENT_CATEGORIES)[number];

export const ACHIEVEMENT_TYPES = ["instant", "progress"] as const;

export type AchievementType = (typeof ACHIEVEMENT_TYPES)[number];

export const MODE_RESTRICTIONS = ["ALL", "CASUAL_ONLY"] as const;

export type ModeRestriction = (typeof MODE_RESTRICTIONS)[number];

export const STORE_ITEM_TYPES = ["cosmetic", "entry", "powerup"] as const;

export type StoreItemType = (typeof STORE_ITEM_TYPES)[number];

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export type ConditionValue = number | boolean | string;

export interface AchievementCondition {
  field: string;
  op: Operator;
  value: ConditionValue;
}

export interface AchievementTier {
  at: number;
  coins: number;
}

export interface Achievement {
  id: string;
  category: AchievementCategory;
  name: string;
  desc: string;
  type: AchievementType;
  trigger: Trigger;
  condition: AchievementCondition;
  coins: number;
  hidden?: boolean;
  active?: boolean;
  tiers?: AchievementTier[];
  targetWords?: string[];
  note?: string;
}

export interface EarnRule {
  id: string;
  trigger: Trigger;
  coins: number;
  note?: string;
  active?: boolean;
  bonus?: {
    perWordPoint: number;
    maxBonus: number;
  };
  oncePerDay?: boolean;
  streakMultiplier?: Record<string, number>;
}

export interface StoreItem {
  id: string;
  type: StoreItemType;
  name: string;
  cost: number;
  modeRestriction: ModeRestriction;
  desc?: string;
  payoutCurrency?: string;
  note?: string;
}

export interface CurrencyDef {
  id: string;
  displayName: string;
  convertibleToChips: boolean;
  convertibleToCash: boolean;
  icon?: string;
  note?: string;
}

export interface Definitions {
  version: string;
  currency: Record<string, CurrencyDef>;
  earnRules: EarnRule[];
  achievements: Achievement[];
  store: StoreItem[];
}

// ============================================================
// CURRENCY
// ============================================================

export const CURRENCY: Record<string, CurrencyDef> = {
  coins: {
    id: "coins",
    displayName: "Coins",
    convertibleToChips: false,
    convertibleToCash: false,
    icon: "coin_gold",
    note: "Meta progression currency. Never converts to chips/cash in competitive modes. Balance games may supersede this firewall.",
  },
  chips: {
    id: "chips",
    displayName: "Chips",
    convertibleToChips: false,
    convertibleToCash: false,
    note: "Wagering currency only. Managed by the betting engine.",
  },
} as const;

// ============================================================
// 1. PASSIVE EARN RULES
// ============================================================

export const EARN_RULES: EarnRule[] = [
  {
    id: "hand_complete",
    trigger: "REACHED_SHOWDOWN",
    coins: 5,
    note: "Rewards staying in the hand, not just folding to grind.",
  },
  {
    id: "hand_win",
    trigger: "WON_HAND",
    coins: 20,
    bonus: {
      perWordPoint: 0.5,
      maxBonus: 50,
    },
    note: "Scales off WORD score (skill), never pot size (money).",
  },
  {
    id: "daily_first_win",
    trigger: "WON_HAND",
    coins: 100,
    oncePerDay: true,
    note: "Single most effective retention lever. Resets at local midnight.",
  },
  {
    id: "login_streak",
    trigger: "DAILY_LOGIN",
    coins: 25,
    streakMultiplier: {
      day1: 1.0,
      day3: 1.25,
      day7: 1.5,
      day14: 1.75,
      day30: 2.0,
    },
    note: "Multiplier applied to the day's earned coins. Resets if a day is missed.",
  },
];

// ============================================================
// 2. ACHIEVEMENTS
// ============================================================

export const ACHIEVEMENTS: Achievement[] = [
  // ---- WORDCRAFT ----
  {
    id: "heavy_hitter",
    category: "wordcraft",
    name: "Heavy Hitter",
    desc: "Play a word worth 25+ points.",
    type: "instant",
    trigger: "WORD_SUBMITTED",
    condition: { field: "wordScore", op: ">=", value: 25 },
    coins: 75,
    hidden: false,
  },
  {
    id: "full_house",
    category: "wordcraft",
    name: "Full House",
    desc: "Win 10 hands using all 7 tiles (full-rack bonus).",
    type: "progress",
    trigger: "USED_FULL_RACK",
    condition: { field: "count", op: ">=", value: 10 },
    coins: 200,
    tiers: [
      { at: 1, coins: 20 },
      { at: 5, coins: 60 },
      { at: 10, coins: 200 },
    ],
  },
  {
    id: "double_trouble",
    category: "wordcraft",
    name: "Double Trouble",
    desc: "Win a hand where a doubled tile pushed your score over the winner.",
    type: "instant",
    trigger: "DOUBLED_TILE_DECIDED_WIN",
    condition: { field: "decidedByDoubledTile", op: "==", value: true },
    coins: 100,
  },
  {
    id: "tile_whisperer",
    category: "wordcraft",
    name: "Tile Whisperer",
    desc: "Use a two-letter tile in a winning word 25 times.",
    type: "progress",
    trigger: "USED_TWO_LETTER_TILE",
    condition: { field: "count", op: ">=", value: 25 },
    coins: 150,
  },
  {
    id: "q_without_u",
    category: "wordcraft",
    name: "Q Without U",
    desc: "Play a valid Q-word with no U (QI, QAT, QOPH...).",
    type: "instant",
    trigger: "PLAYED_SPECIFIC_WORD",
    condition: { field: "word", op: "matches", value: "^Q(?!U).*" },
    coins: 120,
    note: "Rewards dictionary depth. Validate against TWL/SOWPODS list first.",
  },
  {
    id: "vocabularian",
    category: "wordcraft",
    name: "Vocabularian",
    desc: "Play 100 unique distinct words across your history.",
    type: "progress",
    trigger: "WORD_SUBMITTED",
    condition: { field: "uniqueWordCount", op: ">=", value: 100 },
    coins: 250,
    note: "Engine must dedupe: only increment when word not in player's seen-set.",
  },

  // ---- POKER SKILL ----
  {
    id: "ice_cold",
    category: "poker",
    name: "Ice Cold",
    desc: "Win a hand after going all-in pre-flop.",
    type: "instant",
    trigger: "ALL_IN_WIN",
    condition: { field: "allInPhase", op: "==", value: "PRE_FLOP" },
    coins: 80,
  },
  {
    id: "read_em",
    category: "poker",
    name: "Read 'Em",
    desc: "Win 5 hands where you raised on the river.",
    type: "progress",
    trigger: "RIVER_RAISE_WIN",
    condition: { field: "count", op: ">=", value: 5 },
    coins: 120,
  },
  {
    id: "comeback",
    category: "poker",
    name: "Comeback",
    desc: "Win a hand from below 10% of starting chips.",
    type: "instant",
    trigger: "COMEBACK_WIN",
    condition: { field: "stackRatioAtHandStart", op: "<", value: 0.1 },
    coins: 150,
  },

  // ---- VOLUME / PROGRESSION ----
  {
    id: "hands_played",
    category: "progression",
    name: "Table Veteran",
    desc: "Play hands. The grind tier.",
    type: "progress",
    trigger: "REACHED_SHOWDOWN",
    condition: { field: "count", op: ">=", value: 10000 },
    coins: 0,
    tiers: [
      { at: 10, coins: 25 },
      { at: 100, coins: 100 },
      { at: 1000, coins: 500 },
      { at: 10000, coins: 2500 },
    ],
  },
  {
    id: "tournament_regular",
    category: "progression",
    name: "Tournament Regular",
    desc: "Enter tournaments.",
    type: "progress",
    trigger: "TOURNAMENT_ENTERED",
    condition: { field: "count", op: ">=", value: 50 },
    coins: 0,
    active: false,
    tiers: [
      { at: 1, coins: 30 },
      { at: 10, coins: 150 },
      { at: 50, coins: 600 },
    ],
    note: "Tournament system not yet implemented.",
  },
  {
    id: "sng_winner",
    category: "progression",
    name: "Sit & Go Slayer",
    desc: "Win Sit & Go tournaments.",
    type: "progress",
    trigger: "SNG_WON",
    condition: { field: "count", op: ">=", value: 25 },
    coins: 0,
    active: false,
    tiers: [
      { at: 1, coins: 50 },
      { at: 5, coins: 200 },
      { at: 25, coins: 1000 },
    ],
    note: "Sit & Go tournament system not yet implemented.",
  },

  // ---- HIDDEN / FUN ----
  {
    id: "brewmaster",
    category: "hidden",
    name: "Brewmaster",
    desc: "Play ALE, IPA, HOPS, and MALT (across any hands).",
    type: "progress",
    trigger: "PLAYED_SPECIFIC_WORD",
    condition: { field: "targetWordsPlayed", op: ">=", value: 4 },
    targetWords: ["ALE", "IPA", "HOPS", "MALT"],
    coins: 150,
    hidden: true,
    note: "Engine tracks a set; increments when a NEW target word from the list is played.",
  },
  {
    id: "anticlimax",
    category: "hidden",
    name: "Anticlimax",
    desc: "Win a showdown with a 2-letter word.",
    type: "instant",
    trigger: "WON_HAND",
    condition: { field: "wordLength", op: "==", value: 2 },
    coins: 60,
    hidden: true,
  },
];

// ============================================================
// 3. COIN SINKS — STORE
// ============================================================

export const STORE_ITEMS: StoreItem[] = [
  {
    id: "tile_skin_marble",
    type: "cosmetic",
    name: "Marble Tiles",
    cost: 500,
    modeRestriction: "ALL",
  },
  {
    id: "felt_midnight",
    type: "cosmetic",
    name: "Midnight Felt",
    cost: 750,
    modeRestriction: "ALL",
  },
  {
    id: "win_anim_goldrush",
    type: "cosmetic",
    name: "Gold Rush Win Animation",
    cost: 1000,
    modeRestriction: "ALL",
    note: "Cosmetic variant of your floating-chips-to-winner effect.",
  },
  {
    id: "freeroll_entry_coin",
    type: "entry",
    name: "Coin Freeroll Entry",
    cost: 250,
    payoutCurrency: "coins",
    modeRestriction: "ALL",
  },
  {
    id: "powerup_extra_time",
    type: "powerup",
    name: "+10s Word Builder",
    desc: "Adds 10s to the 60s reveal timer.",
    cost: 100,
    modeRestriction: "CASUAL_ONLY",
    note: "Affects scoring conditions, so it's pay-to-win if allowed in competitive play.",
  },
  {
    id: "powerup_tile_peek",
    type: "powerup",
    name: "Tile Peek",
    desc: "Reveal the next community tile one-time before the flop.",
    cost: 200,
    modeRestriction: "CASUAL_ONLY",
  },
];

// ============================================================
// FULL DEFINITIONS OBJECT
// ============================================================

export const DEFINITIONS: Definitions = {
  version: "1.0.0",
  currency: CURRENCY,
  earnRules: EARN_RULES,
  achievements: ACHIEVEMENTS,
  store: STORE_ITEMS,
};

// ============================================================
// LOOKUP HELPERS
// ============================================================

export function getAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

export function getEarnRule(id: string): EarnRule | undefined {
  return EARN_RULES.find((r) => r.id === id);
}

export function getStoreItem(id: string): StoreItem | undefined {
  return STORE_ITEMS.find((s) => s.id === id);
}

export function getActiveAchievements(): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.active !== false);
}

export function getActiveEarnRules(): EarnRule[] {
  return EARN_RULES.filter((r) => r.active !== false);
}

// ============================================================
// VALIDATION
// ============================================================

export interface ValidationError {
  section: string;
  id: string;
  message: string;
}

export function validateDefinitionsExplicit(
  earnRules: EarnRule[],
  achievements: Achievement[],
  storeItems: StoreItem[],
): ValidationError[] {
  const errors: ValidationError[] = [];

  const allIds = new Map<string, string>();
  const registerId = (section: string, id: string) => {
    const existing = allIds.get(id);
    if (existing) {
      errors.push({
        section,
        id,
        message: `Duplicate ID "${id}" — already used in ${existing}.`,
      });
    } else {
      allIds.set(id, section);
    }
  };

  for (const rule of earnRules) {
    registerId("earnRules", rule.id);
  }
  for (const achievement of achievements) {
    registerId("achievements", achievement.id);
  }
  for (const item of storeItems) {
    registerId("store", item.id);
  }

  for (const rule of earnRules) {
    if (!(TRIGGERS as readonly string[]).includes(rule.trigger)) {
      errors.push({
        section: "earnRules",
        id: rule.id,
        message: `Unsupported trigger "${rule.trigger}".`,
      });
    }

    if (rule.coins < 0) {
      errors.push({
        section: "earnRules",
        id: rule.id,
        message: `Invalid coins value ${rule.coins} — must be non-negative.`,
      });
    }

    if (rule.bonus) {
      if (rule.bonus.perWordPoint < 0) {
        errors.push({
          section: "earnRules",
          id: rule.id,
          message: `Invalid bonus perWordPoint ${rule.bonus.perWordPoint} — must be non-negative.`,
        });
      }
      if (rule.bonus.maxBonus < 0) {
        errors.push({
          section: "earnRules",
          id: rule.id,
          message: `Invalid bonus maxBonus ${rule.bonus.maxBonus} — must be non-negative.`,
        });
      }
    }

    if (rule.streakMultiplier) {
      for (const [key, value] of Object.entries(rule.streakMultiplier)) {
        if (value < 0) {
          errors.push({
            section: "earnRules",
            id: rule.id,
            message: `Invalid streak multiplier ${value} at ${key} — must be non-negative.`,
          });
        }
      }
    }
  }

  const achievementIds = new Set<string>();
  for (const achievement of achievements) {
    if (achievementIds.has(achievement.id)) {
      errors.push({
        section: "achievements",
        id: achievement.id,
        message: `Duplicate achievement ID "${achievement.id}".`,
      });
    }
    achievementIds.add(achievement.id);

    if (!(TRIGGERS as readonly string[]).includes(achievement.trigger)) {
      errors.push({
        section: "achievements",
        id: achievement.id,
        message: `Unsupported trigger "${achievement.trigger}".`,
      });
    }

    if (!(OPERATORS as readonly string[]).includes(achievement.condition.op)) {
      errors.push({
        section: "achievements",
        id: achievement.id,
        message: `Unsupported operator "${achievement.condition.op}".`,
      });
    }

    if (
      !(ACHIEVEMENT_CATEGORIES as readonly string[]).includes(
        achievement.category,
      )
    ) {
      errors.push({
        section: "achievements",
        id: achievement.id,
        message: `Invalid category "${achievement.category}".`,
      });
    }

    if (
      !(ACHIEVEMENT_TYPES as readonly string[]).includes(achievement.type)
    ) {
      errors.push({
        section: "achievements",
        id: achievement.id,
        message: `Invalid type "${achievement.type}".`,
      });
    }

    if (achievement.coins < 0) {
      errors.push({
        section: "achievements",
        id: achievement.id,
        message: `Invalid coins value ${achievement.coins} — must be non-negative.`,
      });
    } else if (
      achievement.coins === 0 &&
      (!achievement.tiers || achievement.tiers.length === 0)
    ) {
      errors.push({
        section: "achievements",
        id: achievement.id,
        message: `Coins is 0 but no tiers are defined — tiered payout expected.`,
      });
    }

    if (achievement.tiers && achievement.tiers.length > 0) {
      let prevAt = 0;
      const seenAts = new Set<number>();
      for (const tier of achievement.tiers) {
        if (tier.at <= 0) {
          errors.push({
            section: "achievements",
            id: achievement.id,
            message: `Tier threshold ${tier.at} must be positive.`,
          });
        }
        if (tier.at <= prevAt) {
          errors.push({
            section: "achievements",
            id: achievement.id,
            message: `Tier thresholds must be strictly ascending: ${prevAt} then ${tier.at}.`,
          });
        }
        if (seenAts.has(tier.at)) {
          errors.push({
            section: "achievements",
            id: achievement.id,
            message: `Duplicate tier threshold ${tier.at}.`,
          });
        }
        if (tier.coins < 0) {
          errors.push({
            section: "achievements",
            id: achievement.id,
            message: `Tier coins ${tier.coins} must be non-negative.`,
          });
        }
        seenAts.add(tier.at);
        prevAt = tier.at;
      }
    }
  }

  const storeIds = new Set<string>();
  for (const item of storeItems) {
    if (storeIds.has(item.id)) {
      errors.push({
        section: "store",
        id: item.id,
        message: `Duplicate store item ID "${item.id}".`,
      });
    }
    storeIds.add(item.id);

    if (item.cost <= 0) {
      errors.push({
        section: "store",
        id: item.id,
        message: `Invalid cost ${item.cost} — must be positive.`,
      });
    }

    if (
      !(STORE_ITEM_TYPES as readonly string[]).includes(item.type)
    ) {
      errors.push({
        section: "store",
        id: item.id,
        message: `Invalid store item type "${item.type}".`,
      });
    }

    if (
      !(MODE_RESTRICTIONS as readonly string[]).includes(
        item.modeRestriction,
      )
    ) {
      errors.push({
        section: "store",
        id: item.id,
        message: `Invalid mode restriction "${item.modeRestriction}".`,
      });
    }
  }

  return errors;
}

export function validateDefinitions(): ValidationError[] {
  return validateDefinitionsExplicit(EARN_RULES, ACHIEVEMENTS, STORE_ITEMS);
}
