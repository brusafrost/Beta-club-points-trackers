#!/usr/bin/env sh
# Simple Surge deploy helper
# Usage:
#  - Non-interactive CI: SURGE_TOKEN=... ./surge.sh
#  - Interactive: ./surge.sh (you'll be prompted by surge)

set -e

# Configurable build output directory and domain
BUILD_DIR=${BUILD_DIR:-"./dist"}
SURGE_DOMAIN=${SURGE_DOMAIN:-"betaclub-gcps-live.surge.sh"}

# Prefer token-based non-interactive deploy (CI)
if [ -n "$SURGE_TOKEN" ]; then
  echo "Using SURGE_TOKEN for non-interactive deploy to $SURGE_DOMAIN"
  npx surge "$BUILD_DIR" "$SURGE_DOMAIN" --token "$SURGE_TOKEN"
else
  echo "No SURGE_TOKEN detected. Running interactive deploy to $SURGE_DOMAIN"
  echo "If you want CI to deploy non-interactively, set SURGE_TOKEN in your repo secrets."
  npx surge "$BUILD_DIR" "$SURGE_DOMAIN"
fi
