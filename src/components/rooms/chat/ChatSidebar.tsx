import { Send, MessageCircle } from "lucide-react";
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

type ChatSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
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

export function ChatSidebar({
  isOpen,
  onClose,
  messages,
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
            className="w-80 max-w-[90vw] border-l border-white/10 p-0 sm:w-96"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Table Chat</SheetTitle>
              <SheetDescription>Chat with players</SheetDescription>
            </SheetHeader>
            <ChatPanelContent
              messages={messages}
              draftMessage={draftMessage}
              onDraftMessageChange={onDraftMessageChange}
              onSendMessage={onSendMessage}
              hidePlayerBubbles
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
  return (
    <button
      onClick={onClick}
      className="relative rounded-full bg-linear-to-br from-amber-600 to-amber-700 p-3 text-white shadow-lg transition-all hover:scale-105 hover:from-amber-500 hover:to-amber-600 [@media(min-width:1441px)]:hidden"
    >
      <MessageCircle className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}
