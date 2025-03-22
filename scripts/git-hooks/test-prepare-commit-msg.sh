#!/usr/bin/env bash

# This script tests the prepare-commit-msg hook by simulating a commit
# It creates a temporary commit message file and passes it to the hook

# Exit on error
set -e

# Create a temporary file to simulate a commit message
TEMP_COMMIT_MSG=$(mktemp)
echo "feat: test commit message" > "$TEMP_COMMIT_MSG"

echo "Original commit message:"
cat "$TEMP_COMMIT_MSG"

# Get the current branch name
BRANCH_NAME=$(git symbolic-ref --short HEAD)
echo -e "\nCurrent branch: $BRANCH_NAME"

# Call the hook script with the temp file
echo -e "\nRunning prepare-commit-msg hook..."
./.husky/prepare-commit-msg "$TEMP_COMMIT_MSG"

# Display the result
echo -e "\nModified commit message:"
cat "$TEMP_COMMIT_MSG"

# Check if the message was correctly modified
if grep -q "\[#[0-9]\+\]" "$TEMP_COMMIT_MSG"; then
  echo -e "\n✅ Success! The issue number was correctly appended."
else
  echo -e "\n❌ Error: The issue number was not appended. Check your branch name and hook script."
fi

# Clean up
rm "$TEMP_COMMIT_MSG"

echo -e "\nTest complete. To verify in a real scenario, make a commit with:"
echo "git add ."
echo "git commit -m \"feat: implement issue number suffix for commit messages\""
echo "Then check the commit log with: git log -1" 