# Issue tracker

## Platform

[Linear](https://linear.app)

## Workflow

Issues are created in a Linear project board and move through the standard flow: backlog → in progress → done. Labels track priority and type.

## Integration

When Linear MCP tools (`linear_create_issue`, `linear_list_issues`, `linear_save_comment`, etc.) are available in the agent environment, skills should use them directly to create, read, update, and comment on issues.

When Linear tools are not available, skills should write issues as markdown files under `.scratch/<feature>/` for the user to transfer to Linear manually.
