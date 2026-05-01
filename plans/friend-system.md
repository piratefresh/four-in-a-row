# Friend System V1

## Summary

Build a simple authenticated friend system with exact-match user discovery, friend requests, online status, browser push notifications, and game invites. Invites should prefer the inviter's active room; if they are not in a room, create a normal room for them and send the friend there on accept.

## Key Changes

- Add Convex tables for friendships, friend requests, user presence, game invites, push subscriptions, and notification cooldown state.
- Add `convex/friends.ts` public APIs:
  - search exact user by email or exact display name
  - send, accept, decline, cancel friend requests
  - list friends with online state and active room metadata
  - remove friend
- Add `convex/presence.ts` APIs:
  - authenticated heartbeat from the app shell
  - query current viewer notification settings and online friends
  - online means `lastSeenAt` within a short threshold, initially 2 minutes
- Add `convex/gameInvites.ts` APIs:
  - invite friend to current active room if present
  - otherwise create a new room using existing room creation helpers
  - accept invite joins the room via existing `joinAuthenticatedUserToRoom`
  - decline/dismiss invite
  - expire pending invites after a short window, initially 10 minutes
- Add browser push support:
  - add a service worker under `public/`
  - add frontend push subscription utilities
  - add Convex Node action for Web Push using `web-push`
  - store VAPID keys via env: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, plus frontend `VITE_VAPID_PUBLIC_KEY`
  - ask permission only from an explicit settings/friends toggle

## UI Behavior

- Add a Friends entry point in `Header` with a compact panel showing:
  - pending requests
  - friend list with online/offline indicators
  - invite button for online friends
  - incoming game invites with accept/decline actions
- Add a Friends section or route reachable from the header/settings for exact-match search and request management.
- Add notification controls in `settings.tsx`:
  - enable browser notifications
  - disable/remove this browser's push subscription
- Use in-app toasts for foreground events and browser push for background-capable online/invite notifications.
- Online notifications fire only when an accepted friend transitions offline to online and respect a per-friend cooldown, initially 30 minutes.

## Public Interfaces And Types

- Friend status values: `pending`, `accepted`, `declined`, `cancelled`.
- Game invite status values: `pending`, `accepted`, `declined`, `expired`.
- Only accepted friends can see each other's online state or send game invites.
- Discovery returns only exact matches and only minimal profile fields: user id, display name, avatar, and whether a request/friendship already exists.
- Browser push payloads contain only notification-safe fields: type, title, body, optional room code/deep link, and invite id.

## Test Plan

- Convex unit tests for exact-match search privacy, request lifecycle, duplicate request prevention, accept/decline/cancel behavior, and unfriend behavior.
- Convex tests for presence threshold, offline-to-online transition, cooldown suppression, and accepted-friends-only visibility.
- Convex tests for invite flow: active-room reuse, new-room creation fallback, accept joins room, decline, expiration, non-friend rejection, and room-full error handling.
- Frontend tests for friends panel states, notification toggle behavior with denied/unsupported browser notifications, and invite accept navigation.
- Manual smoke test with two accounts: add friend, enable push, go offline/online, invite to active room, accept invite, and verify both users land in the same room.

## Assumptions

- V1 uses authenticated, verified users only; guest tutorial users and dev bots cannot send friend requests or invites.
- Friend discovery uses Better Auth user ids, matching the existing room membership model.
- Browser push requires adding the `web-push` dependency and configuring VAPID env vars before production use.
- Push is best-effort: in-app toasts and live Convex queries remain the primary UX while the app is open.
