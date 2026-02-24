# Ticket 6: Room Cleanup Job

## Summary
Add scheduled cleanup for inactive empty rooms.

## Deliverables
- Scheduled Convex function (every 10 minutes)
- Remove rooms with no active players and stale `lastActiveAt` (> 1 hour)
- Cascade delete associated players and messages

## Acceptance Criteria
- Eligible inactive rooms are removed
- Active rooms are never removed
- Cleanup function is idempotent and safe to rerun
