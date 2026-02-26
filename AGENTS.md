# Agent Style Guide

## Component Architecture
- Prefer shared context (or a focused state/store hook) over passing long chains of props.
- Keep component prop surfaces small and intentional.
- If multiple children need the same game state/actions, provide them through context.

## File And Size Guidelines
- Keep components near `<= 250` lines when practical.
- When a section grows large (for example showdown/results blocks), extract it to its own component file.
- Keep route files focused on data loading, navigation, and orchestration.
- Move rendering-heavy UI sections into `src/components/...`.

## Refactor Heuristics
- Extract repeated or deeply nested JSX into named components.
- Group related state and handlers behind clear APIs (context value or custom hook).
- Favor readable composition over monolithic files.
