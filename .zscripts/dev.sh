#!/bin/bash
set -e

cd /home/z/my-project

# Install dependencies
bun install

# Push database schema
bun run db:push

# Start dev server — direct execution without pipe
# (pipe | tee causes SIGPIPE when parent subshell exits)
exec ./node_modules/.bin/next dev -p 3000
