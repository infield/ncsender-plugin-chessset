#!/bin/sh
# Build the installable ZIP. Run from the project root: ./build.sh [--no-bump]
# Bumps the patch version in the manifest (unless --no-bump), bundles src/ with
# build.mjs, then zips com.infield.chessset/ as com.infield.chessset-<version>.zip.
# Adapted from AAxis build.sh (implementation plan P2, D12).
set -e
cd "$(dirname "$0")"
M=com.infield.chessset/manifest.json
V=$(python3 -c "import json;print(json.load(open('$M'))['version'])")
if [ "$1" = "--no-bump" ]; then
  NEW=$V
else
  NEW=$(python3 -c "v='$V'.split('.');v[2]=str(int(v[2])+1);print('.'.join(v))")
  python3 - <<PY
import re
p='$M'; s=open(p).read()
open(p,'w').write(re.sub(r'"version": "[^"]+"','"version": "$NEW"',s,count=1))
PY
fi
node build.mjs
rm -f com.infield.chessset-*.zip
zip -qr "com.infield.chessset-$NEW.zip" com.infield.chessset -x '*.DS_Store'
echo "built com.infield.chessset-$NEW.zip  (remember to add a $NEW entry to com.infield.chessset/CHANGELOG.md)"
