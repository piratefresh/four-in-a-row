# Ticket 5: Room Route with Presence and Chat

## Summary
Build `/poker/room/$code` route for live room experience.

## Deliverables
- Route: `src/routes/poker/room/$code.tsx`
- Presence list (name + seat)
- Chat panel with realtime messages
- Message input + send action
- Leave room action
- Heartbeat timer (30s)

## Acceptance Criteria
- Presence updates without reload
- New chat messages appear live
- Leaving room updates presence correctly
- Reconnect with saved token restores user context when valid
