# Domain docs

## Layout

**Single-context** — one global domain context for the whole repo.

| File           | Purpose                                              |
| -------------- | ---------------------------------------------------- |
| `./CONTEXT.md` | Domain language, concepts, and architectural context |
| `./docs/adr/`  | Architecture Decision Records (not yet created)      |

## Consumer rules

Skills that read `CONTEXT.md` (`improve-codebase-architecture`, `diagnose`, `tdd`) should:

1. Read `./CONTEXT.md` before making architectural or naming decisions
2. Read relevant ADRs from `./docs/adr/` when touching subsystems with recorded decisions
3. Update `./CONTEXT.md` when introducing new domain concepts or changing existing ones
4. Write an ADR to `./docs/adr/` for significant architectural decisions
