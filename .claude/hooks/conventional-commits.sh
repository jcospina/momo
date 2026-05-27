#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG="$SCRIPT_DIR/hooks.config.json"
PAYLOAD=$(cat)

ENABLED=$(python3 -c "import json; c=json.load(open('$CONFIG')); print(c.get('conventionalCommits',{}).get('enabled',False))" 2>/dev/null || echo "False")
if [ "$ENABLED" != "True" ]; then
  echo '{}'
  exit 0
fi

export HOOK_CONFIG="$CONFIG"
export HOOK_PAYLOAD="$PAYLOAD"
python3 << 'PYEOF'
import json, re, sys, os

try:
    payload = json.loads(os.environ['HOOK_PAYLOAD'])
    config = json.load(open(os.environ['HOOK_CONFIG']))
except Exception:
    print('{}')
    sys.exit(0)

cc = config.get('conventionalCommits', {})
pattern = cc.get('pattern', '')
prefixes = cc.get('prefixes', [])
ticket_pattern = cc.get('ticketPattern')

command = payload.get('tool_input', {}).get('command', '')
if not command or 'git commit' not in command:
    print('{}')
    sys.exit(0)

# Skip --amend without -m
if '--amend' in command and '-m' not in command:
    print('{}')
    sys.exit(0)

def extract_commit_message(cmd):
    # HEREDOC pattern
    m = re.search(r"<<['\"]?EOF['\"]?\s*\n([\s\S]*?)\nEOF", cmd)
    if m:
        for line in m.group(1).split('\n'):
            if line.strip():
                return line.strip()
        return None
    # -m 'message' or -m "message"
    m = re.search(r'-m\s+["\']([^"\']*)["\']', cmd)
    if m:
        return m.group(1).split('\n')[0].strip()
    # -m message (no quotes)
    m = re.search(r'-m\s+(\S+)', cmd)
    if m:
        return m.group(1).strip()
    return None

message = extract_commit_message(command)
if not message:
    print('{}')
    sys.exit(0)

if not re.match(pattern, message):
    result = {
        'hookSpecificOutput': {
            'hookEventName': 'PreToolUse',
            'permissionDecision': 'deny',
            'permissionDecisionReason': f'Commit message does not follow conventional format. Rewrite it now and retry the commit without asking the user — message rewrites are pre-approved. Preserve the original intent, just adjust the format.\nRejected message: "{message}"\nRequired pattern: <type>(<scope>): <description>\nAllowed prefixes: {", ".join(prefixes)}'
        }
    }
    print(json.dumps(result))
    sys.exit(0)

if ticket_pattern and not re.search(ticket_pattern, message):
    result = {
        'hookSpecificOutput': {
            'hookEventName': 'PreToolUse',
            'permissionDecision': 'deny',
            'permissionDecisionReason': f'Commit message is missing the required ticket reference. Add a ticket that matches the pattern below and retry the commit without asking the user — the user has pre-approved adding ticket references. If you do not know the ticket, ask the user for it; otherwise proceed.\nRejected message: "{message}"\nRequired ticket pattern: {ticket_pattern}'
        }
    }
    print(json.dumps(result))
    sys.exit(0)

print('{}')
PYEOF
