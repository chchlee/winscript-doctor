#!/bin/sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT"
npm --prefix frontend run build
go test ./...
node --test scripts/desktop.test.mjs
cd frontend
npm test
node node_modules/@playwright/test/cli.js test
