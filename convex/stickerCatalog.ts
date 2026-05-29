export const ROOM_STICKER_TTL_MS = 3_000;

export const ROOM_STICKERS = [
  { key: "cheer", label: "Cheer", symbol: "👏" },
  { key: "thanks", label: "Thanks", symbol: "🙏" },
  { key: "sorry", label: "Sorry", symbol: "😬" },
  { key: "taunt", label: "Taunt", symbol: "😈" },
  { key: "help", label: "Help", symbol: "❓" },
  { key: "bye", label: "Bye", symbol: "👋" },
  { key: "follow", label: "Follow", symbol: "👉" },
  { key: "wow", label: "Wow", symbol: "😮" },
] as const;

export type RoomStickerKey = (typeof ROOM_STICKERS)[number]["key"];

export function isRoomStickerKey(value: string): value is RoomStickerKey {
  return ROOM_STICKERS.some((sticker) => sticker.key === value);
}

export function getRoomSticker(key: string) {
  return ROOM_STICKERS.find((sticker) => sticker.key === key) ?? null;
}
