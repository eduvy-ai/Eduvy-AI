#!/usr/bin/env bash
# Render build script — runs before the server starts
set -e

echo "==> Installing Python dependencies..."
pip install -r requirements.txt

echo "==> Installing Playwright Chromium browser..."
export PLAYWRIGHT_BROWSERS_PATH=/opt/render/project/.playwright
python -m playwright install chromium

echo "==> Build complete."
