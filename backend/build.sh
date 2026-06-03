#!/usr/bin/env bash
# Render build script — runs before the server starts
set -e

echo "==> Installing Python dependencies..."
pip install -r requirements.txt

echo "==> Installing system packages (ffmpeg + Chromium dependencies)..."
apt-get update -qq
apt-get install -y --no-install-recommends \
    ffmpeg \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libgtk-3-0 \
    libx11-xcb1

echo "==> Installing Playwright Chromium browser..."
python -m playwright install chromium

echo "==> Build complete."
