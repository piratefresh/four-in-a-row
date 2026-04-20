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

## AI Configuration

### AI Providers

The game supports AI opponents powered by LLMs for betting decisions. Two providers are available:

1. **OpenRouter** (default) - Uses `z-ai/glm-4.5-air:free` model
2. **NVIDIA NIM** - Uses `google/gemma-3-27b-it` model

### Environment Variables

Add these to `.env.local`:

```bash
# AI Provider Selection (default: openrouter)
AI_PROVIDER=openrouter  # or "nvidia_nim"

# OpenRouter Configuration (for AI opponents)
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1  # optional, defaults to this
OPENROUTER_MODEL=z-ai/glm-4.5-air:free  # optional, defaults to this

# NVIDIA NIM Configuration (alternative provider)
NVIDIA_NIM_API_KEY=your_nvidia_nim_api_key_here  # optional if using OpenRouter
NVIDIA_NIM_BASE_URL=https://integrate.api.nvidia.com/v1  # optional
NVIDIA_NIM_MODEL=google/gemma-3-27b-it  # optional
```

### Getting API Keys

- **OpenRouter**: Sign up at [openrouter.ai](https://openrouter.ai) - free tier available
- **NVIDIA NIM**: Get key from [NVIDIA API catalog](https://build.nvidia.com)

### AI Behavior

- **Betting decisions**: Powered by selected LLM provider (OpenRouter or NVIDIA NIM)
- **Word selection**: Uses deterministic algorithm for reliability
- **Fallback**: If no API key configured, uses rule-based deterministic betting
- **Difficulty levels**: Easy, Medium, Hard (affects bluffing frequency and risk tolerance)
- **Bot personalities**: Cautious, Balanced, Aggressive, Creative
