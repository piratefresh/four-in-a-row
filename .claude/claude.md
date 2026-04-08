# Project Configuration

## Package Manager

**This project uses Bun as the package manager.**

### Commands

- Install dependencies: `bun install`
- Run dev server: `bun run dev`
- Build project: `bun run build`
- Run tests: `bun run test`
- Preview build: `bun run preview`
- Deploy: `bun run deploy`

### Important Notes

- Always use `bun` instead of `npm` for all package management and script execution
- Bun is faster and more efficient for this project
- Lock file: `bun.lockb` (binary format)

## Project Overview

This is **Word Poker** - a strategic word-building poker game that combines letter tiles, betting mechanics, and vocabulary skills.

**Game Rules**: See [WORD_POKER_RULES.md](../WORD_POKER_RULES.md) for complete game specification, scoring system, and mechanics.

### Tech Stack
- **Frontend**: TanStack Start (React Router + SSR)
- **Backend**: Convex (realtime database and functions)
- **Auth**: Better Auth with Convex integration
- **Styling**: Tailwind CSS v4
- **Testing**: Vitest

## Development Workflow

1. Start Convex dev: `bunx convex dev` (in separate terminal)
2. Start frontend dev: `bun run dev`
3. Access app at: `http://localhost:3000`

## Architecture

- `/convex` - Backend mutations, queries, and schema
- `/src/routes` - Frontend routes and pages
- `/src/components` - React components
- `/tickets` - Feature tickets and documentation

## Testing

- Unit tests: `bun run test`
- Manual integration tests documented in `convex/games.test.ts`
