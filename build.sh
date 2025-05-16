#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${CHROME_API_KEY:-}" ]]; then
  echo "Error: CHROME_API_KEY を設定してください" >&2
  exit 1
fi

# 1. dist をクリア
rm -rf dist
mkdir -p dist

# 2. 静的ファイルコピー
cp manifest.json dist/
cp icon*.png dist/
cp popup.html dist/

# 3. placeholder を置換して一時ファイルに出力
sed "s|__API_KEY__|$CHROME_API_KEY|g" background.js > dist/background.tmp.js
sed "s|__API_KEY__|$CHROME_API_KEY|g" popup.js      > dist/popup.tmp.js

# 4. Terser で minify → dist/*.js に出力
npx terser dist/background.tmp.js \
  --compress --mangle \
  --output dist/background.js

npx terser dist/popup.tmp.js \
  --compress --mangle \
  --output dist/popup.js

# 5. 一時ファイルを削除
rm dist/*.tmp.js

echo "ビルド＆minify完了: dist/ に background.js / popup.js を出力しました"
