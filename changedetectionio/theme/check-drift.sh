#!/bin/bash
# Compare every upstream file we override (overrides.txt: "<path> <pinned blob sha>") with what is
# in the tree now. Prints the upstream diff for each one that moved; exit 1 on drift.
#   check-drift.sh                 check all
#   check-drift.sh --update <path> re-pin <path> to the current upstream blob (after porting)
cd "$(git rev-parse --show-toplevel)" || exit 2
LIST=changedetectionio/theme/overrides.txt

if [ "$1" = "--update" ]; then
  [ -n "$2" ] && grep -q "^$2 " "$LIST" || { echo "usage: $0 --update <path listed in overrides.txt>"; exit 2; }
  sed -i "s|^$2 .*|$2 $(git hash-object -w "$2")|" "$LIST" && echo "re-pinned $2"
  exit
fi

drift=0
while read -r path pinned; do
  [ -z "$path" ] || [ "${path:0:1}" = "#" ] && continue
  current=$(git hash-object -w "$path" 2>/dev/null)
  [ "$current" = "$pinned" ] && continue
  drift=1
  echo "== DRIFT: $path ($pinned -> ${current:-missing})"
  git diff "$pinned" "$current" -- 2>/dev/null || echo "(pinned blob not in object db; diff against the old upstream commit instead)"
done < "$LIST"
[ $drift = 0 ] && echo "no drift"
exit $drift
