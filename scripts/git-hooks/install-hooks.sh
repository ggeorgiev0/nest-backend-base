#!/bin/sh

# This script installs the prepare-commit-msg hook to both standard Git hooks location
# and Husky hooks location to ensure it works in all configurations

echo "Installing prepare-commit-msg hook..."

# Copy to standard Git hooks location
cp scripts/git-hooks/prepare-commit-msg .git/hooks/prepare-commit-msg
chmod +x .git/hooks/prepare-commit-msg

# Copy to Husky hooks location (keeping the Husky initialization)
if [ -f .husky/_/prepare-commit-msg ]; then
  # Extract the Husky initialization lines
  HUSKY_INIT=$(head -n 2 .husky/_/prepare-commit-msg)
  
  # Get our hook content (excluding the shebang)
  HOOK_CONTENT=$(tail -n +2 scripts/git-hooks/prepare-commit-msg)
  
  # Combine them
  echo "$HUSKY_INIT" > .husky/_/prepare-commit-msg
  echo "" >> .husky/_/prepare-commit-msg
  echo "$HOOK_CONTENT" >> .husky/_/prepare-commit-msg
  
  chmod +x .husky/_/prepare-commit-msg
fi

echo "Git hooks installed successfully!" 