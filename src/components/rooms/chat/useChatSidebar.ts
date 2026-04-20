import { useState, useCallback, useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: number;
  type: "player" | "ai" | "system";
  isCurrentPlayer?: boolean;
};

export function useChatSidebar(
  roomId: Id<"rooms"> | undefined,
  isDesktopDocked = false,
) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [draftMessage, setDraftMessage] = useState("");
  const previousMessageCountRef = useRef(0);
  const hasInitializedRoomMessagesRef = useRef(false);

  // Fetch messages from Convex
  const messages = useQuery(
    api.messages.list,
    roomId ? { roomId, limit: 100 } : "skip"
  ) as ChatMessage[] | undefined;

  // Send message mutation
  const sendMessageMutation = useMutation(api.messages.send);

  const toggleChat = useCallback(() => {
    setIsOpen((prev) => {
      if (!prev) {
        // Opening chat - clear unread count
        setUnreadCount(0);
      }
      return !prev;
    });
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!roomId) return;

      const trimmedMessage = message.trim();
      if (!trimmedMessage) return;

      try {
        await sendMessageMutation({
          roomId,
          text: trimmedMessage,
          type: "player",
        });
        setDraftMessage("");
      } catch (error) {
        console.error("Failed to send message:", error);
      }
    },
    [roomId, sendMessageMutation]
  );

  useEffect(() => {
    setIsOpen(false);
    setUnreadCount(0);
    setDraftMessage("");
    previousMessageCountRef.current = 0;
    hasInitializedRoomMessagesRef.current = false;
  }, [roomId]);

  useEffect(() => {
    if (!messages) {
      return;
    }

    const messageCount = messages?.length ?? 0;

    if (!hasInitializedRoomMessagesRef.current) {
      previousMessageCountRef.current = messageCount;
      hasInitializedRoomMessagesRef.current = true;
      return;
    }

    if (isOpen || isDesktopDocked) {
      setUnreadCount(0);
      previousMessageCountRef.current = messageCount;
      return;
    }

    if (messageCount > previousMessageCountRef.current) {
      setUnreadCount(
        (prev) => prev + (messageCount - previousMessageCountRef.current),
      );
    }

    previousMessageCountRef.current = messageCount;
  }, [isDesktopDocked, isOpen, messages]);

  return {
    isOpen,
    messages: messages || [],
    unreadCount,
    draftMessage,
    setDraftMessage,
    toggleChat,
    closeChat,
    sendMessage,
  };
}
