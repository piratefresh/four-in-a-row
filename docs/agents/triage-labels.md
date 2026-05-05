# Triage labels

The `triage` skill uses these labels to track issue state through the triage state machine. These are the configured Linear label names for this repo.

| Role              | Label              | Meaning                                        |
| ----------------- | ------------------ | ---------------------------------------------- |
| `needs-triage`    | `needs-triage`     | Maintainer needs to evaluate this issue        |
| `needs-info`      | `needs-info`       | Waiting on the reporter for more detail        |
| `ready-for-agent` | `ready-for-agent`  | Fully specified — an AFK agent can pick it up  |
| `ready-for-human` | `ready-for-human`  | Needs human implementation                     |
| `wontfix`         | `wontfix`          | Will not be actioned                           |

To change a mapping, edit the right-hand column. Do not change the role names in the left column — those are the canonical names the skills expect.
