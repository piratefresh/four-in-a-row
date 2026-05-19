import { describe, expect, it } from "vitest";
import {
  canCloseIdleLobbyRoom,
  canListOpenRoom,
  canReuseLinkedNextRoom,
  getOfflineBotSourcePlayers,
  isRoomPastInactivityTimeout,
} from "./rooms";

describe("offline next-hand bot carry-forward", () => {
  it("keeps bot seats from room history even if those bot players are no longer active", () => {
    const players = [
      {
        authUserId: "user-1",
        seatIndex: 0,
        lastSeenAt: 5000,
      },
      {
        authUserId: "dev-bot:nora:room-a:1",
        seatIndex: 1,
        lastSeenAt: 1000,
      },
      {
        authUserId: "dev-bot:jax:room-a:2",
        seatIndex: 2,
        lastSeenAt: 1000,
      },
      {
        authUserId: "dev-bot:mira:room-a:3",
        seatIndex: 3,
        lastSeenAt: 1000,
      },
    ];

    expect(getOfflineBotSourcePlayers(players)).toEqual([
      players[1],
      players[2],
      players[3],
    ]);
  });

  it("uses the latest bot record per seat when room history contains multiple bot entries", () => {
    const olderBotSeatOne = {
      authUserId: "dev-bot:nora:room-a:1",
      seatIndex: 1,
      lastSeenAt: 1000,
    };
    const newerBotSeatOne = {
      authUserId: "dev-bot:nora:room-b:1",
      seatIndex: 1,
      lastSeenAt: 2000,
    };
    const botSeatThree = {
      authUserId: "dev-bot:mira:room-b:3",
      seatIndex: 3,
      lastSeenAt: 1500,
    };

    expect(
      getOfflineBotSourcePlayers([
        olderBotSeatOne,
        botSeatThree,
        newerBotSeatOne,
      ]),
    ).toEqual([newerBotSeatOne, botSeatThree]);
  });
});

describe("linked next-room reuse", () => {
  it("only reuses a linked room when it is open and has no players or games", () => {
    expect(
      canReuseLinkedNextRoom({
        roomStatus: "open",
        activePlayerCount: 0,
        existingGameCount: 0,
      }),
    ).toBe(true);

    expect(
      canReuseLinkedNextRoom({
        roomStatus: "closed",
        activePlayerCount: 0,
        existingGameCount: 0,
      }),
    ).toBe(false);

    expect(
      canReuseLinkedNextRoom({
        roomStatus: "open",
        activePlayerCount: 1,
        existingGameCount: 0,
      }),
    ).toBe(false);

    expect(
      canReuseLinkedNextRoom({
        roomStatus: "open",
        activePlayerCount: 0,
        existingGameCount: 1,
      }),
    ).toBe(false);
  });
});

describe("room inactivity timeout", () => {
  it("expires a lobby room after the configured idle duration", () => {
    const now = 1_000_000;

    expect(
      isRoomPastInactivityTimeout(
        { lastActiveAt: now - 299_999 },
        now,
        300_000,
      ),
    ).toBe(false);

    expect(
      isRoomPastInactivityTimeout(
        { lastActiveAt: now - 300_000 },
        now,
        300_000,
      ),
    ).toBe(true);
  });

  it("does not close an idle lobby while an active player is still seated", () => {
    expect(
      canCloseIdleLobbyRoom({
        isTutorial: false,
        isPastInactivityTimeout: true,
        activePlayerCount: 1,
        hasActiveGame: false,
        hasCompletedGame: false,
      }),
    ).toBe(false);
  });

  it("closes an idle lobby only after all players have left", () => {
    expect(
      canCloseIdleLobbyRoom({
        isTutorial: false,
        isPastInactivityTimeout: true,
        activePlayerCount: 0,
        hasActiveGame: false,
        hasCompletedGame: false,
      }),
    ).toBe(true);
  });
});

describe("room list visibility", () => {
  it("keeps rematch rooms visible when completed history has a waiting hand", () => {
    expect(
      canListOpenRoom({
        isTutorial: false,
        isBotGame: false,
        hasMode: false,
        hasCompletedGame: true,
        hasCurrentJoinableGame: true,
      }),
    ).toBe(true);
  });

  it("hides completed-only rooms without a current joinable hand", () => {
    expect(
      canListOpenRoom({
        isTutorial: false,
        isBotGame: false,
        hasMode: false,
        hasCompletedGame: true,
        hasCurrentJoinableGame: false,
      }),
    ).toBe(false);
  });
});
