#!/bin/sh
set -eu

if [ -f package-lock.json ]; then
  npm ci --ignore-scripts
fi

npm run db:migrate
npm run build