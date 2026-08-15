#!/bin/bash
set -e

cd /home/z/my-project

bun install
bun run db:push

# بدون pipe — pipe باعث SIGPIPE و مرگ سرور می‌شود
exec ./node_modules/.bin/next dev -p 3000
