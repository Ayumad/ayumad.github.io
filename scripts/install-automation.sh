#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")/.." && pwd)"
launch_agents_dir="$HOME/Library/LaunchAgents"
logs_dir="$HOME/Library/Logs/AyumadKnowledge"
plist_path="$launch_agents_dir/me.ayumad.knowledge-sync.plist"
node_bin="$(command -v node)"
npm_bin="$(command -v npm)"

mkdir -p "$launch_agents_dir" "$logs_dir"
sed \
  -e "s|__PROJECT_DIR__|$project_dir|g" \
  -e "s|__NODE_BIN__|$node_bin|g" \
  -e "s|__NPM_BIN__|$npm_bin|g" \
  scripts/me.ayumad.knowledge-sync.plist.template > "$plist_path"

launchctl bootout "gui/$(id -u)" "$plist_path" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$plist_path"
launchctl enable "gui/$(id -u)/me.ayumad.knowledge-sync"
echo "Automatic knowledge-site synchronization is installed."
echo "Logs: $logs_dir"
