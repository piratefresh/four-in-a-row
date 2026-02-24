# Ticket 2: Room Lifecycle Mutations

## Objective
Implement Convex mutations that create/join/leave rooms and maintain player presence using `playerToken` as the identity key.

## Why This Ticket Exists
Ticket 1 added schema tables for `rooms`, `players`, and `messages`. This ticket adds the write-path for room lifecycle so the app can:
- create a room with a host player
- join by room code with seat assignment
- leave without deleting history
- keep presence alive via heartbeat

These mutations are the foundation for realtime room presence and chat in later tickets.

## Current State
- Schema includes `rooms`, `players`, `messages`.
- No room lifecycle mutations are implemented yet.
- `players.playerToken` is indexed and will be used for identity.

## Scope
- Implement mutations:
  - `createRoom({ name })`
  - `joinRoom({ code, name })`
  - `leaveRoom({ playerToken })`
  - `heartbeat({ playerToken })`
- Add shared validation/helpers needed by these mutations.
- Ensure room/player timestamps are updated consistently.

## Out of Scope
- Lobby queries
- Presence subscriptions/query APIs
- Chat message mutations
- Cleanup cron for inactive rooms
- Auth-user linkage to room players

## API Contracts

### 1) `createRoom({ name })`
Input:
- `name: string` (trimmed, non-empty)

Behavior:
- Generate a unique room `code` suitable for manual entry.
- Insert `rooms` row with:
  - `status: "open"`
  - `maxPlayers: 4`
  - `createdAt = now`
  - `lastActiveAt = now`
- Insert host player in same room:
  - `seatIndex: 0`
  - `isHost: true`
  - `status: "active"`
  - `lastSeenAt = now`
  - generated `playerToken` (unguessable random string)
- Update `rooms.hostPlayerId` to inserted host player id.

Return:
- `roomId`
- `code`
- `playerId`
- `playerToken`
- `seatIndex`
- `maxPlayers`

### 2) `joinRoom({ code, name })`
Input:
- `code: string` (normalized for lookup, e.g. trimmed + uppercase)
- `name: string` (trimmed, non-empty)

Behavior:
- Resolve room by unique `code`.
- Reject if room does not exist.
- Reject if room `status !== "open"`.
- Compute occupied seats from players in same room with `status: "active"`.
- Reject if active player count is `>= maxPlayers`.
- Assign first available seat index in `[0, maxPlayers - 1]`.
- Insert player row with:
  - `isHost: false`
  - `status: "active"`
  - generated `playerToken`
  - `lastSeenAt = now`
- Update `rooms.lastActiveAt = now`.

Return:
- `roomId`
- `code`
- `playerId`
- `playerToken`
- `seatIndex`
- `maxPlayers`

### 3) `leaveRoom({ playerToken })`
Input:
- `playerToken: string`

Behavior:
- Resolve player by `playerToken`.
- Reject if token is invalid (player not found).
- If player already `status: "left"`, treat as idempotent success.
- Otherwise patch player:
  - `status: "left"`
  - `lastSeenAt = now`
- Patch room:
  - `lastActiveAt = now`
- If leaving player is the host and room still has active players, reassign host to lowest `seatIndex` active player.
- If no active players remain, set room `status: "closed"` (data kept for cleanup policy later).

Return:
- `ok: true`
- `roomId`
- `wasAlreadyLeft: boolean`
- `roomStatus`

### 4) `heartbeat({ playerToken })`
Input:
- `playerToken: string`

Behavior:
- Resolve player by `playerToken`.
- Reject if token invalid.
- Reject if player status is `"left"` (client should rejoin/create instead).
- Patch:
  - `players.lastSeenAt = now`
  - `rooms.lastActiveAt = now`

Return:
- `ok: true`
- `roomId`
- `playerId`
- `lastSeenAt`

## Rules and Constraints
- Max players is fixed to `4` for this milestone.
- Room codes must be unique; collision handling required on create.
- Seat assignment always picks the lowest available seat index.
- Player identity across mutations is based only on `playerToken`.
- Name normalization/validation must be consistent between create/join.

## Validation and Error Semantics
Define clear app errors (names can vary, semantics must match):
- `INVALID_NAME`: empty or invalid name input.
- `INVALID_CODE`: malformed or empty room code input.
- `ROOM_NOT_FOUND`: no room for code.
- `ROOM_CLOSED`: room exists but is closed.
- `ROOM_FULL`: active seats exhausted.
- `INVALID_PLAYER_TOKEN`: token does not resolve to a player.
- `PLAYER_LEFT`: heartbeat attempted for already-left player.

All mutation handlers should fail fast with deterministic error reasons.

## Implementation Plan

### 1) Add mutation module
- Create `convex/rooms.ts` (or equivalent app module) with all four mutations.
- Export typed Convex `mutation` handlers with validators for args.

### 2) Add helper utilities
- `normalizeName(name)` and validation guard.
- `normalizeRoomCode(code)` for join lookups.
- `generateRoomCode()` with retry loop for uniqueness.
- `generatePlayerToken()` using secure random token generation.
- `findFirstAvailableSeat(activePlayers, maxPlayers)`.

### 3) Implement create/join
- Ensure all writes use a single logical mutation per request.
- Use room/player indexes:
  - rooms by `code`
  - players by `roomId_status`
  - players by `playerToken`

### 4) Implement leave/heartbeat
- Token lookup first, then room-aware updates.
- Keep leave idempotent for robustness against duplicate requests.
- Handle host reassignment and close-on-empty behavior.

### 5) Add tests
- Unit/integration tests for success + failure paths.
- Include seat assignment and code collision scenarios.

## File-Level Changes
- Create: `convex/rooms.ts` (or existing module where room mutations live)
- Add/update tests for mutation handlers (project test location)
- Optional: shared helper module if needed for validation/code generation

## Acceptance Criteria
1. `createRoom` returns room code + player token + assigned seat for host.
2. `joinRoom` rejects invalid/missing/closed/full rooms with clear errors.
3. `joinRoom` assigns the first available seat index.
4. `leaveRoom` marks player as left and updates room activity.
5. `leaveRoom` is idempotent for repeated calls with same token.
6. `heartbeat` updates both `players.lastSeenAt` and `rooms.lastActiveAt`.
7. All token-based mutations resolve identity only via `playerToken`.

## Verification Checklist
- Create a room and verify:
  - room is open, `maxPlayers = 4`
  - host seat is `0`
  - token is returned and stored
- Join same room with 3 additional players and confirm seats `1,2,3`.
- Attempt 5th join and verify `ROOM_FULL`.
- Attempt join with bad code and verify `ROOM_NOT_FOUND`.
- Call heartbeat and verify both timestamps advance.
- Leave as non-host and verify status flips to left.
- Leave as host while others active and verify host is reassigned.
- Leave last active player and verify room transitions to closed.

## Risks
- Room code collision loop not bounded or not retried correctly.
- Race conditions under concurrent joins causing duplicate seat assignment.
- Inconsistent input normalization causing false "room not found" results.
- Non-idempotent leave behavior causing unstable client recovery.

## Dependencies
- Ticket 1 schema changes must be merged and codegen up to date.

## Done Definition
This ticket is done when all four mutations are implemented with stable validation/error handling, pass tests for core and edge paths, and satisfy the acceptance criteria above.
