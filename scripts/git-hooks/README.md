# Git Hooks

This directory contains custom git hooks used in the project.

## prepare-commit-msg

The `prepare-commit-msg` hook automatically appends the issue number from branch names to commit messages.

### Functionality

- Extracts issue numbers from branch names following the pattern: `feature-description-XX`
- Appends the issue number in the format `[#XX]` to the commit message
- Skips processing for merge commits, amended commits, or commits with messages from files
- Avoids adding duplicate issue references

### Examples

If your branch is named `error-handling-4` and your commit message is:

```
feat: add proper error handling
```

The hook will automatically modify it to:

```
feat: add proper error handling [#4]
```

### Installation

The hook is automatically installed by Husky when you run `yarn install`.

If you need to install it manually:

1. Copy the hook to the Git hooks directory:

   ```bash
   cp scripts/git-hooks/prepare-commit-msg .git/hooks/
   ```

2. Make it executable:
   ```bash
   chmod +x .git/hooks/prepare-commit-msg
   ```

## Configuration

This hook doesn't require any configuration. It works automatically based on your branch naming convention.

## Troubleshooting

If the hook is not working:

1. Make sure it's executable:

   ```bash
   chmod +x .husky/prepare-commit-msg
   ```

2. Verify your branch name follows the convention with a number at the end:

   ```bash
   git branch
   ```

3. Check the hook content to ensure it's properly installed:

   ```bash
   cat .husky/prepare-commit-msg
   ```

4. For debugging, you can add echo statements to the script to see what's happening.
