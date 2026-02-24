# Ticket 7: Test Coverage for Room, Presence, Chat

## Summary
Add focused tests for backend logic and key UI smoke paths.

## Deliverables
- Unit tests: room code generation, seat allocation, join/leave constraints
- Unit tests: message ordering and last-50 behavior
- Unit tests: cleanup job selection and deletion behavior
- UI smoke: signed-in lobby renders list/create/join
- UI smoke: room renders presence + chat shell

## Acceptance Criteria
- Tests run in CI/local without schema regressions
- Critical room lifecycle and chat behaviors are covered
