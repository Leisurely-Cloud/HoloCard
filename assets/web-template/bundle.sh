#!/usr/bin/env bash
# Rebuild the single-file viewer using the project's locked local toolchain.
set -eu
cd "$(dirname "$0")"
npm run build
