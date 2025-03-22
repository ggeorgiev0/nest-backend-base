#!/bin/bash

# Ensure the script exits on any error
set -e

# Define the source files
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PREPARE_COMMIT_MSG_SOURCE="${SCRIPT_DIR}/prepare-commit-msg"
COMMIT_MSG_SOURCE="${SCRIPT_DIR}/commit-msg"

# Define the destination directories
GIT_HOOKS_DIR=".git/hooks"
HUSKY_HOOKS_DIR=".husky/_"

# Create destination directories if they don't exist
mkdir -p "${GIT_HOOKS_DIR}"
mkdir -p "${HUSKY_HOOKS_DIR}"

# Copy prepare-commit-msg hooks
echo "Installing prepare-commit-msg hook..."
cp "${PREPARE_COMMIT_MSG_SOURCE}" "${GIT_HOOKS_DIR}/prepare-commit-msg"
cp "${PREPARE_COMMIT_MSG_SOURCE}" "${HUSKY_HOOKS_DIR}/prepare-commit-msg"

# Make hooks executable
chmod +x "${GIT_HOOKS_DIR}/prepare-commit-msg"
chmod +x "${HUSKY_HOOKS_DIR}/prepare-commit-msg"

# Copy commit-msg hooks
echo "Installing commit-msg hook..."
cp "${COMMIT_MSG_SOURCE}" "${GIT_HOOKS_DIR}/commit-msg"
cp "${COMMIT_MSG_SOURCE}" "${HUSKY_HOOKS_DIR}/commit-msg"

# Make commit-msg hooks executable
chmod +x "${GIT_HOOKS_DIR}/commit-msg"
chmod +x "${HUSKY_HOOKS_DIR}/commit-msg"

echo "Git hooks installed successfully." 