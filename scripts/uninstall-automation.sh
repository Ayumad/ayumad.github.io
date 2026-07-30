#!/usr/bin/env bash
set -euo pipefail
plist_path="$HOME/Library/LaunchAgents/me.ayumad.knowledge-sync.plist"
launchctl bootout "gui/$(id -u)" "$plist_path" 2>/dev/null || true
rm -f "$plist_path"
echo "Automatic knowledge-site synchronization was removed. Existing logs were kept."
