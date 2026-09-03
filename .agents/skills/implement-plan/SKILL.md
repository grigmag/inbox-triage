---
name: implement-plan
description: Implement an approved repository implementation plan slice by slice. Use only when explicitly invoked to execute a plan with a fresh subagent for each slice and at least one commit after every completed slice.
---

# Implement Plan

1. Read the plan, repository instructions, and current worktree. Identify the ordered implementation slices and preserve unrelated changes.
2. For each slice, in dependency order:
   - start a new subagent and assign only that slice;
   - require it to implement the slice, run its focused verification, and create at least one commit containing the slice's work;
   - review the diff, verification, and commit before starting the next slice;
   - keep corrections for that slice with the same subagent and require another commit when corrections change files.
3. After all slices, run the plan's complete final verification and report the commits and any unresolved acceptance items.

Do not combine slices in one subagent or begin a dependent slice before its predecessor is complete. Never bypass hooks or commit unrelated user changes.
