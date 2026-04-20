# Chat Sidebar

A toggleable chat sidebar for players to communicate during the game.

## Features

- **Player-to-Player Chat**: Send messages to other players at the table
- **AI Chat**: AI players can send messages (styled differently)
- **System Messages**: Display game events and notifications
- **Unread Count Badge**: Shows number of unread messages when sidebar is closed
- **Responsive**: Slides in from the right, works on mobile and desktop
- **Message Types**: Different styling for player, AI, and system messages

## Usage

### Basic Example

```tsx
import { ChatSidebar, ChatToggleButton } from "@/components/rooms/chat/ChatSidebar";
import { useChatSidebar } from "@/components/rooms/chat/useChatSidebar";

function RoomComponent() {
  const {
    isOpen,
    messages,
    unreadCount,
    toggleChat,
    closeChat,
    sendMessage,
    addSystemMessage,
  } = useChatSidebar();

  const currentPlayerName = "John";
  const currentPlayerId = "player-123";

  const handleSendMessage = (message: string) => {
    sendMessage(message, currentPlayerName, currentPlayerId);
  };

  return (
    <div className="relative">
      {/* Your game content */}

      {/* Chat toggle button - position it wherever you want */}
      <div className="fixed bottom-6 right-6 z-30">
        <ChatToggleButton onClick={toggleChat} unreadCount={unreadCount} />
      </div>

      {/* Chat sidebar */}
      <ChatSidebar
        isOpen={isOpen}
        onClose={closeChat}
        messages={messages}
        onSendMessage={handleSendMessage}
        currentPlayerName={currentPlayerName}
      />
    </div>
  );
}
```

### Adding Messages Programmatically

```tsx
// Add a system message
addSystemMessage("John joined the table");

// Add an AI message (from backend)
addMessage({
  senderId: "ai-1",
  senderName: "Robot",
  message: "Good luck everyone!",
  type: "ai",
  isCurrentPlayer: false,
});

// Add another player's message (from backend)
addMessage({
  senderId: "player-456",
  senderName: "Jane",
  message: "Let's play!",
  type: "player",
  isCurrentPlayer: false,
});
```

## Message Types

- **`player`**: Regular player messages (gray background)
- **`ai`**: AI player messages (purple background with AI badge)
- **`system`**: System notifications (blue background, centered)

## Styling

The chat sidebar uses:
- Tailwind CSS for styling
- Lucide React for icons
- Gradient backgrounds and borders
- Responsive design (slides over content on mobile, can be docked on desktop)

## Backend Integration

To integrate with Convex:

1. Create a `messages` table in your Convex schema
2. Add mutations for sending messages
3. Add queries/subscriptions for receiving messages
4. Update the `sendMessage` callback in `useChatSidebar.ts` to call your Convex mutation
5. Subscribe to messages in your room component and call `addMessage` when new messages arrive
