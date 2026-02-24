# Ticket 3: Realtime Queries for Room and Lobby

## Summary
Add Convex queries to support signed-in lobby and room page subscriptions.

## Deliverables
- `listRooms()` for active table list
- `getRoom(code, playerToken?)`
- `listMessages(roomId)`

## Data Requirements
- Lobby item: room code and player count
- Room view: active players, seat indexes, recent messages

## Acceptance Criteria
- Query responses are realtime-updating
- `getRoom` resolves current user when token is valid
- Room query remains safe when token is missing or invalid
