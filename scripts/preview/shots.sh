#!/usr/bin/env bash
# Render the dev-only UI preview gallery (src/entrypoints/preview) per Spotify
# theme with headless Chrome and build a contact sheet, for design review.
#
#   scripts/preview/shots.sh                 # default themes
#   scripts/preview/shots.sh ocean citrus    # chosen themes
#   SKIP_BUILD=1 scripts/preview/shots.sh    # reuse the last preview build
#
# Branded Chrome no longer honours --load-extension, so the built page is served
# from a static server with shim.js standing in for the chrome.* APIs. Output
# lands in .output/preview-shots/ (sheet.png plus one PNG per surface/theme).
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
SITE=$ROOT/.output/preview-site
OUT=$ROOT/.output/preview-shots
PROFILE=$ROOT/.output/preview-chrome-profile
PORT=${PORT:-8787}
CHROME=${CHROME:-"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"}
THEMES=("$@")
[ ${#THEMES[@]} -eq 0 ] && THEMES=(spotify hot_pink matcha mars citrus)

if [ -z "${SKIP_BUILD:-}" ]; then
    (cd "$ROOT" && CHORUS_PREVIEW=1 bun run build >/dev/null)
fi

rm -rf "$SITE"
mkdir -p "$SITE" "$OUT"
rsync -a --exclude models --exclude ort "$ROOT/.output/chrome-mv3/" "$SITE/"
cp "$ROOT/scripts/preview/shim.js" "$SITE/shim.js"
python3 - "$SITE/preview.html" <<'PY'
import sys, pathlib
p = pathlib.Path(sys.argv[1]); s = p.read_text()
assert '<script type="module"' in s, "preview.html not built; is CHORUS_PREVIEW=1 set?"
p.write_text(s.replace('<script type="module"', '<script src="/shim.js"></script>\n    <script type="module"', 1))
PY

python3 -m http.server "$PORT" --directory "$SITE" --bind 127.0.0.1 >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true' EXIT
sleep 1

shot() { # name query width height
    "$CHROME" --headless=new --disable-gpu --hide-scrollbars --no-first-run --no-default-browser-check \
        --disable-extensions --force-device-scale-factor=1 --user-data-dir="$PROFILE" \
        --window-size="$3,$4" --virtual-time-budget=6000 --screenshot="$OUT/$1.png" \
        "http://127.0.0.1:$PORT/preview.html?$2" >/dev/null 2>&1
}

for t in "${THEMES[@]}"; do
    shot "popover-$t" "scene=tabs&tab=snip&theme=$t" 500 420
    shot "dialog-$t" "scene=dialog&theme=$t" 1000 920
    shot "bar-$t" "scene=bar&theme=$t" 1340 150
done

{
    echo '<!doctype html><meta charset="utf-8"><body style="margin:0;padding:16px;background:#060606;color:#bbb;font:12px ui-monospace,monospace">'
    echo '<table style="border-collapse:collapse"><tr><th></th><th align=left>popover (1:1)</th><th align=left>settings dialog (1:2)</th><th align=left>player bar (1:2)</th></tr>'
    for t in "${THEMES[@]}"; do
        echo "<tr><td style='padding:8px 12px;vertical-align:top;white-space:nowrap'><b>$t</b></td>"
        echo "<td style='padding:8px;vertical-align:top'><img src='file://$OUT/popover-$t.png' width=460></td>"
        echo "<td style='padding:8px;vertical-align:top'><img src='file://$OUT/dialog-$t.png' width=500></td>"
        echo "<td style='padding:8px;vertical-align:top'><img src='file://$OUT/bar-$t.png' width=670></td></tr>"
    done
    echo '</table></body>'
} > "$OUT/sheet.html"
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --no-first-run --no-default-browser-check \
    --disable-extensions --force-device-scale-factor=1 --user-data-dir="$PROFILE" \
    --window-size="1760,$((${#THEMES[@]} * 490 + 40))" --virtual-time-budget=4000 \
    --screenshot="$OUT/sheet.png" "file://$OUT/sheet.html" >/dev/null 2>&1

echo "wrote $OUT/sheet.png"
