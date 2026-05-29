import { describe, expect, it } from "vitest";
import {
  ROOM_STICKERS,
  getRoomSticker,
  isRoomStickerKey,
} from "./stickerCatalog";

describe("room sticker catalog", () => {
  it("accepts configured stickers", () => {
    for (const sticker of ROOM_STICKERS) {
      expect(isRoomStickerKey(sticker.key)).toBe(true);
      expect(getRoomSticker(sticker.key)?.symbol).toBe(sticker.symbol);
    }
  });

  it("rejects unknown sticker keys", () => {
    expect(isRoomStickerKey("dance")).toBe(false);
    expect(getRoomSticker("dance")).toBe(null);
  });
});
