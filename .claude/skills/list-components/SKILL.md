---
name: list-components
description: List project components
arguments:
  - name: subdirectory
    description: Subdirectory inside components to search
    required: false
---

## Task

List all React component files (.tsx, .ts, .jsx, .js) in the components folder.

If a subdirectory is provided via $ARGUMENTS or $1, only list files in `components/$ARGUMENTS`.

## Output Format

- Numbered list of files with relative paths
- Brief one-line description of each (infer from filename)
- Summary count at the end

If no files found, say "No components found."
