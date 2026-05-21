import { Send, MessageCircle } from "lucide-react";
import type { RoomHandLogEntry } from "../board/RoomGameTable.types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: number;
  type: "player" | "ai" | "system";
  isCurrentPlayer?: boolean;
};

const BOT_PERSONALITY_STYLES: Record<
  string,
  { color: string; border: string; bg: string; label: string }
> = {
  cautious: {
    color: "text-sky-400",
    border: "border-sky-500/30",
    bg: "bg-sky-600/20",
    label: "🛡️",
  },
  balanced: {
    color: "text-emerald-400",
    border: "border-emerald-500/30",
    bg: "bg-emerald-600/20",
    label: "📊",
  },
  aggressive: {
    color: "text-red-400",
    border: "border-red-500/30",
    bg: "bg-red-600/20",
    label: "⚔️",
  },
  creative: {
    color: "text-violet-400",
    border: "border-violet-500/30",
    bg: "bg-violet-600/20",
    label: "✨",
  },
};

function getBotMessageStyle(senderId: string) {
  if (!senderId.startsWith("dev-bot:")) return null;
  const parts = senderId.split(":");
  if (parts.length < 2) return null;
  const characterId = parts[1];
  const personalityMap: Record<string, string> = {
    nora: "cautious",
    ellis: "balanced",
    jax: "aggressive",
    mira: "creative",
  };
  const personality = personalityMap[characterId];
  if (!personality) return null;
  return BOT_PERSONALITY_STYLES[personality] ?? null;
}

function getLogDotClass(tone: RoomHandLogEntry["tone"]) {
  if (tone === "raise") return "bg-[#e6b450]";
  if (tone === "fold") return "bg-[#ff5d4e]";
  if (tone === "pot" || tone === "showdown") return "bg-[#d4af37]";
  if (tone === "turn") return "bg-[#7ec4cf]";
  return "bg-[#9ec27a]";
}

function formatTableLogChatTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

type ChatSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  handLogEntries?: RoomHandLogEntry[];
  roomCode?: string;
  draftMessage: string;
  onDraftMessageChange: (value: string) => void;
  onSendMessage: (message: string) => void;
};

function ChatPanelContent({
  messages,
  draftMessage,
  onDraftMessageChange,
  onSendMessage,
  className = "",
  hidePlayerBubbles = false,
}: Pick<
  ChatSidebarProps,
  "messages" | "draftMessage" | "onDraftMessageChange" | "onSendMessage"
> & {
  className?: string;
  hidePlayerBubbles?: boolean;
}) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (draftMessage.trim()) {
      onSendMessage(draftMessage);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div
      className={`flex h-full w-full min-w-0 flex-col border-l border-white/10 bg-linear-to-b from-slate-900 to-slate-950 ${className}`}
    >
      <div className="border-b border-white/10 bg-black/40 px-4 py-3 text-left">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-amber-400" />
          <h2 className="text-base font-semibold text-white">Table Chat</h2>
        </div>
        <p className="sr-only">Chat with players and AI at the table</p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <MessageCircle className="h-12 w-12 text-white/20" />
            <p className="mt-2 text-sm text-white/40">No messages yet</p>
            <p className="mt-1 text-xs text-white/30">
              Start chatting with other players!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const botStyle =
              msg.type === "ai" ? getBotMessageStyle(msg.senderId) : null;
            if (hidePlayerBubbles && msg.isCurrentPlayer) return null;
            return (
              <div key={msg.id} className="space-y-1">
                {msg.type === "system" ? (
                  <div className="rounded-lg bg-blue-500/10 px-3 py-2 text-center">
                    <p className="text-xs text-blue-300">{msg.message}</p>
                  </div>
                ) : (
                  <div
                    className={`rounded-lg border px-3 py-2 ${
                      msg.isCurrentPlayer
                        ? "ml-8 border-amber-500/30 bg-amber-600/20"
                        : botStyle
                          ? `mr-8 ${botStyle.border} ${botStyle.bg}`
                          : "mr-8 border-white/10 bg-slate-800/50"
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className={`text-xs font-semibold ${
                          msg.isCurrentPlayer
                            ? "text-amber-400"
                            : botStyle
                              ? botStyle.color
                              : msg.type === "ai"
                                ? "text-purple-400"
                                : "text-slate-300"
                        }`}
                      >
                        {msg.senderName}
                        {botStyle && (
                          <span className="ml-1 opacity-60">
                            {botStyle.label}
                          </span>
                        )}
                        {msg.type === "ai" && !botStyle && (
                          <span className="ml-1 text-purple-300/60">(AI)</span>
                        )}
                        {msg.isCurrentPlayer && (
                          <span className="ml-1 text-amber-300/60">(you)</span>
                        )}
                      </span>
                      <span className="text-[10px] text-white/40">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-white/90">{msg.message}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-white/10 bg-black/40 p-4"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={draftMessage}
            onChange={(e) => onDraftMessageChange(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-lg border border-white/20 bg-black/50 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20"
            maxLength={200}
          />
          <button
            type="submit"
            disabled={!draftMessage.trim()}
            className="rounded-lg bg-amber-600 px-4 py-2 text-white transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-amber-600"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-[10px] text-white/30">Chat with players</p>
      </form>
    </div>
  );
}

function TableLogPanelContent({
  messages,
  handLogEntries = [],
  roomCode,
  draftMessage,
  onDraftMessageChange,
  onSendMessage,
}: Pick<
  ChatSidebarProps,
  | "messages"
  | "handLogEntries"
  | "roomCode"
  | "draftMessage"
  | "onDraftMessageChange"
  | "onSendMessage"
>) {
  const recentChatMessages = messages.slice(-3);
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedDraft = draftMessage.trim();
    if (!trimmedDraft) return;
    onSendMessage(trimmedDraft);
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col border-l border-[#d4af37]/15 bg-[#071610]">
      <div className="border-b border-[#d4af37]/15 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#ff5d4e] shadow-[0_0_14px_rgba(255,93,78,0.6)]" />
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#e8dcc0]/60">
            Table log / Live
          </div>
        </div>
        <div className="mt-1 font-serif text-[19px] font-semibold italic text-[#f4e4c1]">
          This hand
        </div>
        <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-[#d4af37]/75">
          Room {roomCode ?? "table"}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-5 py-3">
        <div className="py-1">
          {handLogEntries.map((entry, index) => (
            <div
              key={entry.id}
              className="flex items-baseline gap-3 border-b border-[#d4af37]/[0.06] py-2.5"
            >
              <span
                className={`mt-1 h-1.5 w-1.5 flex-none rounded-full ${getLogDotClass(entry.tone)}`}
              />
              <span className="w-9 flex-none font-mono text-[10px] text-[#e8dcc0]/35">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-medium leading-snug text-[#f4e4c1]">
                  {entry.message}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-[#d4af37]/15 px-5 py-4">
        <div className="mb-3 font-mono text-[9px] uppercase tracking-[0.18em] text-[#e8dcc0]/45">
          Chat
        </div>
        {recentChatMessages.length === 0 ? (
          <div className="mb-3 text-[12px] text-[#e8dcc0]/45">
            No messages yet.
          </div>
        ) : (
          <div className="mb-3 space-y-3">
            {recentChatMessages.map((message) => (
              <div key={message.id} className="text-[12px]">
                <div className="flex items-baseline gap-2">
                  <span className="truncate font-semibold text-[#d4af37]">
                    {message.senderName}
                  </span>
                  <span className="font-mono text-[9px] text-[#e8dcc0]/40">
                    {formatTableLogChatTime(message.timestamp)}
                  </span>
                </div>
                <div className="mt-0.5 break-words text-[#e8dcc0]">
                  {message.message}
                </div>
              </div>
            ))}
          </div>
        )}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 rounded-md border border-[#d4af37]/15 bg-black/30 px-3 py-2"
        >
          <input
            value={draftMessage}
            onChange={(event) => onDraftMessageChange(event.target.value)}
            placeholder="Type a message..."
            className="min-w-0 flex-1 bg-transparent text-[12px] text-[#e8dcc0] placeholder:text-[#e8dcc0]/35 focus:outline-none"
          />
          <button
            type="submit"
            className="flex h-7 w-7 flex-none items-center justify-center rounded-md border border-[#806316] bg-[linear-gradient(180deg,#f4d35e_0%,#d4af37_60%,#a8801f_100%)] font-mono text-[11px] font-bold text-[#1a1208]"
            aria-label="Send chat message"
          >
            &gt;
          </button>
        </form>
      </div>
    </div>
  );
}

export function ChatSidebar({
  isOpen,
  onClose,
  messages,
  handLogEntries,
  roomCode,
  draftMessage,
  onDraftMessageChange,
  onSendMessage,
}: ChatSidebarProps) {
  return (
    <>
      <div className="hidden [@media(min-width:1441px)]:fixed [@media(min-width:1441px)]:right-0 [@media(min-width:1441px)]:top-12 [@media(min-width:1441px)]:bottom-0 [@media(min-width:1441px)]:z-30 [@media(min-width:1441px)]:flex [@media(min-width:1441px)]:w-[400px] [@media(min-width:1441px)]:min-w-[400px]">
        <ChatPanelContent
          messages={messages}
          draftMessage={draftMessage}
          onDraftMessageChange={onDraftMessageChange}
          onSendMessage={onSendMessage}
        />
      </div>

      <div className="[@media(min-width:1441px)]:hidden">
        <Sheet
          open={isOpen}
          onOpenChange={(open) => {
            if (!open) {
              onClose();
            }
          }}
        >
          <SheetContent
            side="right"
            className="w-80 max-w-[90vw] border-l border-[#d4af37]/15 bg-[#071610] p-0 sm:w-96"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Table Chat</SheetTitle>
              <SheetDescription>Chat with players</SheetDescription>
            </SheetHeader>
            <TableLogPanelContent
              messages={messages}
              handLogEntries={handLogEntries}
              roomCode={roomCode}
              draftMessage={draftMessage}
              onDraftMessageChange={onDraftMessageChange}
              onSendMessage={onSendMessage}
            />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

// Toggle button component
export function ChatToggleButton({
  onClick,
  unreadCount = 0,
}: {
  onClick: () => void;
  unreadCount?: number;
}) {
  const hasUnreadMessages = unreadCount > 0;
  const unreadLabel =
    unreadCount === 1 ? "1 new message" : `${unreadCount} new messages`;

  return (
    <button
      onClick={onClick}
      className={`relative flex h-[46px] w-[46px] items-center justify-center rounded-full border border-[#806316] bg-linear-to-br from-[#f4d35e] via-[#d4af37] to-[#a8801f] text-[#1a1208] shadow-[0_10px_26px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,255,255,0.42)] transition-all hover:scale-105 [@media(min-width:1441px)]:hidden ${
        hasUnreadMessages ? "ring-2 ring-[#ff5d4e]/55 ring-offset-2 ring-offset-[#071610]" : ""
      }`}
      aria-label={
        hasUnreadMessages ? `Open table chat, ${unreadLabel}` : "Open table chat"
      }
      title={hasUnreadMessages ? unreadLabel : "Open table chat"}
    >
      <MessageCircle className="h-[18px] w-[18px]" />
      {hasUnreadMessages && (
        <span className="absolute -right-2 -top-2 flex min-h-6 min-w-6 items-center justify-center rounded-full border-2 border-[#071610] bg-[#ff5d4e] px-1.5 font-mono text-[11px] font-black leading-none text-[#1a1208] shadow-[0_0_0_2px_rgba(255,93,78,0.16),0_8px_18px_rgba(0,0,0,0.38)]">
          <span className="absolute inset-0 rounded-full bg-[#ff5d4e] opacity-45 motion-safe:animate-ping" />
          <span className="relative">{unreadCount > 9 ? "9+" : unreadCount}</span>
        </span>
      )}
    </button>
  );
}
