#!/usr/bin/env bash
# UserPromptSubmit. A prompt holding a key never reaches the model, its logs or its context.
# Exit 2 drops the prompt and shows the reason to the person who typed it.
prompt=$(jq -r '.prompt // ""')
if grep -Eq -- '(sk-[A-Za-z0-9_-]{20,}|sk_live_[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,})' <<<"$prompt"; then
  echo "Blocked: this prompt holds an API key, so it was not sent. Put the key in .env and refer to it by name." >&2
  exit 2
fi
exit 0
