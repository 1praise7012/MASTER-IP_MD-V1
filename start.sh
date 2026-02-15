#!/bin/bash

echo "Installing node modules..."
npm install

echo "Installing system deps..."
apt update && apt install -y ffmpeg python3

echo "Installing yt-dlp..."
pip3 install -U yt-dlp

echo "Starting bot..."
node index.js
