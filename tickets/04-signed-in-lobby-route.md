# Ticket 4: Signed-In Lobby Route

## Summary
Build `/poker` route with Better Auth guard and active table list UI.

## Deliverables
- Route: `src/routes/poker/index.tsx`
- Auth gate for signed-in users
- List of active rooms from `listRooms()`
- Create room form
- Join room by code form

## Acceptance Criteria
- Unauthenticated users cannot access lobby content
- Signed-in users see active rooms in realtime
- Create and join flows navigate to room route successfully
