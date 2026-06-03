#!/usr/bin/env bash
# Render build script — runs before the server starts
set -e

echo "==> Installing Python dependencies..."
pip install -r requirements.txt

echo "==> Installing system packages (ffmpeg)..."
apt-get update -qq
apt-get install -y --no-install-recommends ffmpeg

echo "==> Installing Playwright Chromium browser (with deps)..."
python -m playwright install --with-deps chromium

echo "==> Build complete."
