import { describe, expect, it } from "vitest";
import {
  ACHIEVEMENTS,
  DEFINITIONS,
  EARN_RULES,
  STORE_ITEMS,
  CURRENCY,
  TRIGGERS,
  OPERATORS,
  getAchievement,
  getEarnRule,
  getStoreItem,
  getActiveAchievements,
  getActiveEarnRules,
  validateDefinitions,
  validateDefinitionsExplicit,
  type Achievement,
  type EarnRule,
  type StoreItem,
} from "./definitions";

describe("achievement definitions", () => {
  it("has 4 earn rules", () => {
    expect(EARN_RULES).toHaveLength(4);
  });

  it("has 14 achievements", () => {
    expect(ACHIEVEMENTS).toHaveLength(14);
  });

  it("has 6 store items", () => {
    expect(STORE_ITEMS).toHaveLength(6);
  });

  it("has coins and chips currencies", () => {
    expect(CURRENCY.coins).toBeDefined();
    expect(CURRENCY.chips).toBeDefined();
    expect(CURRENCY.coins.id).toBe("coins");
    expect(CURRENCY.chips.id).toBe("chips");
  });

  it("earn rules have correct IDs", () => {
    const ids = EARN_RULES.map((r) => r.id).sort();
    expect(ids).toEqual([
      "daily_first_win",
      "hand_complete",
      "hand_win",
      "login_streak",
    ]);
  });

  it("achievements have correct IDs", () => {
    const ids = ACHIEVEMENTS.map((a) => a.id).sort();
    expect(ids).toEqual([
      "anticlimax",
      "brewmaster",
      "comeback",
      "double_trouble",
      "full_house",
      "hands_played",
      "heavy_hitter",
      "ice_cold",
      "q_without_u",
      "read_em",
      "sng_winner",
      "tile_whisperer",
      "tournament_regular",
      "vocabularian",
    ]);
  });

  it("store items have correct IDs", () => {
    const ids = STORE_ITEMS.map((s) => s.id).sort();
    expect(ids).toEqual([
      "felt_midnight",
      "freeroll_entry_coin",
      "powerup_extra_time",
      "powerup_tile_peek",
      "tile_skin_marble",
      "win_anim_goldrush",
    ]);
  });

  it("tournament definitions are marked inactive", () => {
    expect(getAchievement("tournament_regular")?.active).toBe(false);
    expect(getAchievement("sng_winner")?.active).toBe(false);
  });

  it("non-tournament achievements are active by default", () => {
    const active = getActiveAchievements();
    expect(active).toHaveLength(12);
    expect(active.some((a) => a.id === "tournament_regular")).toBe(false);
    expect(active.some((a) => a.id === "sng_winner")).toBe(false);
  });

  it("all earn rules are active by default", () => {
    expect(getActiveEarnRules()).toHaveLength(4);
  });

  it("coins are not convertible to chips or cash", () => {
    expect(CURRENCY.coins.convertibleToChips).toBe(false);
    expect(CURRENCY.coins.convertibleToCash).toBe(false);
  });

  it("getAchievement finds by id", () => {
    expect(getAchievement("heavy_hitter")?.name).toBe("Heavy Hitter");
    expect(getAchievement("nonexistent")).toBeUndefined();
  });

  it("getEarnRule finds by id", () => {
    expect(getEarnRule("hand_complete")?.coins).toBe(5);
    expect(getEarnRule("nonexistent")).toBeUndefined();
  });

  it("getStoreItem finds by id", () => {
    expect(getStoreItem("tile_skin_marble")?.cost).toBe(500);
    expect(getStoreItem("nonexistent")).toBeUndefined();
  });
});

describe("validateDefinitions — real definitions", () => {
  it("passes validation with zero errors", () => {
    const errors = validateDefinitions();
    if (errors.length > 0) {
      console.error("Validation errors:", JSON.stringify(errors, null, 2));
    }
    expect(errors).toEqual([]);
  });
});

describe("validateDefinitionsExplicit — duplicate IDs", () => {
  it("rejects duplicate achievement IDs", () => {
    const dup: Achievement[] = [
      { id: "heavy_hitter", category: "wordcraft", name: "A", desc: "d", type: "instant", rarity: "common", trigger: "WORD_SUBMITTED", condition: { field: "x", op: ">=", value: 1 }, coins: 100 },
      { id: "heavy_hitter", category: "wordcraft", name: "B", desc: "d", type: "instant", rarity: "common", trigger: "WORD_SUBMITTED", condition: { field: "x", op: ">=", value: 1 }, coins: 50 },
    ];
    const errors = validateDefinitionsExplicit([], dup, []);
    expect(errors.some((e) => e.id === "heavy_hitter")).toBe(true);
  });

  it("rejects duplicate earn rule IDs", () => {
    const dup: EarnRule[] = [
      { id: "hand_complete", trigger: "REACHED_SHOWDOWN", coins: 5 },
      { id: "hand_complete", trigger: "WON_HAND", coins: 10 },
    ];
    const errors = validateDefinitionsExplicit(dup, [], []);
    expect(errors.some((e) => e.id === "hand_complete")).toBe(true);
  });

  it("rejects duplicate store item IDs", () => {
    const dup: StoreItem[] = [
      { id: "tile_skin_marble", type: "cosmetic", name: "A", cost: 100, modeRestriction: "ALL" },
      { id: "tile_skin_marble", type: "cosmetic", name: "B", cost: 200, modeRestriction: "ALL" },
    ];
    const errors = validateDefinitionsExplicit([], [], dup);
    expect(errors.some((e) => e.id === "tile_skin_marble")).toBe(true);
  });

  it("rejects cross-section duplicate IDs", () => {
    const errors = validateDefinitionsExplicit(
      [],
      [{ id: "x", category: "wordcraft", name: "A", desc: "d", type: "instant", rarity: "common", trigger: "WON_HAND", condition: { field: "x", op: ">=", value: 1 }, coins: 10 }],
      [{ id: "x", type: "cosmetic", name: "B", cost: 5, modeRestriction: "ALL" }],
    );
    expect(errors.some((e) => e.id === "x" && e.message.includes("already used"))).toBe(true);
  });
});

function ach(id: string, trigger: Achievement["trigger"], op: Achievement["condition"]["op"], value: Achievement["condition"]["value"], overrides: Partial<Achievement> = {}): Achievement {
  return {
    id,
    category: "wordcraft",
    name: "T",
    desc: "d",
    type: "instant",
    rarity: "common",
    trigger,
    condition: { field: "x", op, value },
    coins: 10,
    ...overrides,
  } as Achievement;
}

function rule(id: string, trigger: EarnRule["trigger"], coins: number, overrides: Partial<EarnRule> = {}): EarnRule {
  return { id, trigger, coins, ...overrides };
}

function item(id: string, type: StoreItem["type"], cost: number, mode: StoreItem["modeRestriction"], overrides: Partial<StoreItem> = {}): StoreItem {
  return { id, type, name: "T", cost, modeRestriction: mode, ...overrides };
}

describe("validateDefinitionsExplicit — unsupported triggers/operators", () => {
  it("rejects unsupported trigger in achievement", () => {
    const errors = validateDefinitionsExplicit([], [ach("test", "INVALID_TRIGGER" as any, ">=", 1)], []);
    expect(errors.some((e) => e.message.includes("Unsupported trigger"))).toBe(true);
  });

  it("rejects unsupported trigger in earn rule", () => {
    const errors = validateDefinitionsExplicit([rule("test", "INVALID_TRIGGER" as any, 10)], [], []);
    expect(errors.some((e) => e.message.includes("Unsupported trigger"))).toBe(true);
  });

  it("rejects unsupported operator", () => {
    const errors = validateDefinitionsExplicit([], [ach("test", "WON_HAND", "INVALID_OP" as any, 1)], []);
    expect(errors.some((e) => e.message.includes("Unsupported operator"))).toBe(true);
  });

  it("supports all valid operators", () => {
    for (const op of OPERATORS) {
      const errors = validateDefinitionsExplicit([], [ach(`test_${op}`, "WON_HAND", op, 1)], []);
      expect(errors.filter((e) => e.message.includes("operator"))).toEqual([]);
    }
  });

  it("supports all valid triggers", () => {
    for (const trigger of TRIGGERS) {
      const errors = validateDefinitionsExplicit([], [ach(`test_${trigger}`, trigger, ">=", 1)], []);
      expect(errors.filter((e) => e.message.includes("trigger"))).toEqual([]);
    }
  });
});

describe("validateDefinitionsExplicit — invalid/negative rewards", () => {
  it("rejects negative coins on achievement", () => {
    const errors = validateDefinitionsExplicit([], [ach("test", "WON_HAND", ">=", 1, { coins: -1 })], []);
    expect(errors.some((e) => e.message.includes("non-negative"))).toBe(true);
  });

  it("rejects negative coins on earn rule", () => {
    const errors = validateDefinitionsExplicit([rule("test", "WON_HAND", -5)], [], []);
    expect(errors.some((e) => e.message.includes("non-negative"))).toBe(true);
  });

  it("allows zero coins when tiers are present", () => {
    const errors = validateDefinitionsExplicit([], [
      ach("test", "REACHED_SHOWDOWN", ">=", 1, { category: "progression", type: "progress", condition: { field: "count", op: ">=", value: 1 }, coins: 0, tiers: [{ at: 1, coins: 100 }] }),
    ], []);
    expect(errors).toEqual([]);
  });

  it("rejects zero coins without tiers", () => {
    const errors = validateDefinitionsExplicit([], [
      ach("test", "REACHED_SHOWDOWN", ">=", 1, { category: "progression", type: "progress", condition: { field: "count", op: ">=", value: 1 }, coins: 0 }),
    ], []);
    expect(errors.some((e) => e.message.includes("Coins is 0"))).toBe(true);
  });

  it("rejects negative store item cost", () => {
    const errors = validateDefinitionsExplicit([], [], [item("test", "cosmetic", -100, "ALL")]);
    expect(errors.some((e) => e.message.includes("cost"))).toBe(true);
  });

  it("rejects zero store item cost", () => {
    const errors = validateDefinitionsExplicit([], [], [item("test", "cosmetic", 0, "ALL")]);
    expect(errors.some((e) => e.message.includes("cost"))).toBe(true);
  });

  it("rejects negative bonus perWordPoint", () => {
    const errors = validateDefinitionsExplicit([rule("test", "WON_HAND", 10, { bonus: { perWordPoint: -1, maxBonus: 10 } })], [], []);
    expect(errors.some((e) => e.message.includes("perWordPoint"))).toBe(true);
  });

  it("rejects negative bonus maxBonus", () => {
    const errors = validateDefinitionsExplicit([rule("test", "WON_HAND", 10, { bonus: { perWordPoint: 1, maxBonus: -10 } })], [], []);
    expect(errors.some((e) => e.message.includes("maxBonus"))).toBe(true);
  });

  it("rejects negative streak multiplier", () => {
    const errors = validateDefinitionsExplicit([rule("test", "DAILY_LOGIN", 10, { streakMultiplier: { day1: -1.0 } })], [], []);
    expect(errors.some((e) => e.message.includes("streak multiplier"))).toBe(true);
  });
});

describe("validateDefinitionsExplicit — tier thresholds", () => {
  it("rejects non-positive tier threshold (zero)", () => {
    const errors = validateDefinitionsExplicit([], [
      ach("test", "REACHED_SHOWDOWN", ">=", 1, { category: "progression", type: "progress", condition: { field: "count", op: ">=", value: 1 }, coins: 0, tiers: [{ at: 0, coins: 100 }] }),
    ], []);
    expect(errors.some((e) => e.message.includes("must be positive"))).toBe(true);
  });

  it("rejects negative tier threshold", () => {
    const errors = validateDefinitionsExplicit([], [
      ach("test", "REACHED_SHOWDOWN", ">=", 1, { category: "progression", type: "progress", condition: { field: "count", op: ">=", value: 1 }, coins: 0, tiers: [{ at: -1, coins: 100 }] }),
    ], []);
    expect(errors.some((e) => e.message.includes("must be positive"))).toBe(true);
  });

  it("rejects unordered tier thresholds", () => {
    const errors = validateDefinitionsExplicit([], [
      ach("test", "REACHED_SHOWDOWN", ">=", 1, { category: "progression", type: "progress", condition: { field: "count", op: ">=", value: 1 }, coins: 0, tiers: [{ at: 5, coins: 100 }, { at: 1, coins: 50 }] }),
    ], []);
    expect(errors.some((e) => e.message.includes("ascending"))).toBe(true);
  });

  it("rejects duplicate tier thresholds", () => {
    const errors = validateDefinitionsExplicit([], [
      ach("test", "REACHED_SHOWDOWN", ">=", 1, { category: "progression", type: "progress", condition: { field: "count", op: ">=", value: 1 }, coins: 0, tiers: [{ at: 1, coins: 100 }, { at: 1, coins: 200 }] }),
    ], []);
    expect(errors.some((e) => e.message.includes("Duplicate tier"))).toBe(true);
  });

  it("rejects equal tier thresholds (not strictly ascending)", () => {
    const errors = validateDefinitionsExplicit([], [
      ach("test", "REACHED_SHOWDOWN", ">=", 1, { category: "progression", type: "progress", condition: { field: "count", op: ">=", value: 1 }, coins: 0, tiers: [{ at: 5, coins: 100 }, { at: 5, coins: 200 }] }),
    ], []);
    expect(errors.some((e) => e.message.includes("ascending"))).toBe(true);
  });

  it("rejects negative tier coins", () => {
    const errors = validateDefinitionsExplicit([], [
      ach("test", "REACHED_SHOWDOWN", ">=", 1, { category: "progression", type: "progress", condition: { field: "count", op: ">=", value: 1 }, coins: 0, tiers: [{ at: 1, coins: -50 }] }),
    ], []);
    expect(errors.some((e) => e.message.includes("Tier coins"))).toBe(true);
  });
});

describe("validateDefinitionsExplicit — category, type, mode", () => {
  it("rejects invalid achievement category", () => {
    const errors = validateDefinitionsExplicit([], [ach("test", "WON_HAND", ">=", 1, { category: "invalid" as any })], []);
    expect(errors.some((e) => e.message.includes("Invalid category"))).toBe(true);
  });

  it("rejects invalid achievement type", () => {
    const errors = validateDefinitionsExplicit([], [ach("test", "WON_HAND", ">=", 1, { type: "invalid" as any })], []);
    expect(errors.some((e) => e.message.includes("Invalid type"))).toBe(true);
  });

  it("rejects invalid store item type", () => {
    const errors = validateDefinitionsExplicit([], [], [item("test", "invalid" as any, 100, "ALL")]);
    expect(errors.some((e) => e.message.includes("Invalid store item type"))).toBe(true);
  });

  it("rejects invalid mode restriction", () => {
    const errors = validateDefinitionsExplicit([], [], [item("test", "cosmetic", 100, "invalid" as any)]);
    expect(errors.some((e) => e.message.includes("Invalid mode restriction"))).toBe(true);
  });
});

describe("DEFINITIONS object", () => {
  it("has correct version", () => {
    expect(DEFINITIONS.version).toBe("1.0.0");
  });

  it("wraps all sections", () => {
    expect(DEFINITIONS.currency).toBe(CURRENCY);
    expect(DEFINITIONS.earnRules).toBe(EARN_RULES);
    expect(DEFINITIONS.achievements).toBe(ACHIEVEMENTS);
    expect(DEFINITIONS.store).toBe(STORE_ITEMS);
  });
});
