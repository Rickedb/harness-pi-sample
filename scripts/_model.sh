# Sourced by pi-iso and pi-stack. Turns PI_MODEL into a concrete model and checks credentials.
#   PI_MODEL=claude                 -> anthropic/${CLAUDE_MODEL:-claude-sonnet-5-5}
#   PI_MODEL=<provider>/<model-id>  -> used as given
#   (unset)                         -> offline mock model
# Sets: MODEL_RESOLVED (empty when using the mock)
MODEL_RESOLVED=""
if [[ -n "${PI_MODEL:-}" ]]; then
  if [[ "$PI_MODEL" == "claude" ]]; then
    MODEL_RESOLVED="anthropic/${CLAUDE_MODEL:-claude-sonnet-5-5}"
  else
    MODEL_RESOLVED="$PI_MODEL"
  fi
  provider="${MODEL_RESOLVED%%/*}"
  # Fail early and clearly instead of mid-session. (`auth check` is local: it makes no network call.)
  if [[ "${PI_DRY_RUN:-}" != "1" ]] && ! "$HERE/pi-env" auth check --provider "$provider" >/dev/null 2>&1; then
    cat >&2 <<MSG
No credentials for provider "$provider" (model $MODEL_RESOLVED).

Pick one:
  1. API key:   cp .env.example .env   and set ANTHROPIC_API_KEY   (or export it in your shell)
  2. Login:     scripts/pi-env   then type  /login   (API key, or Claude subscription OAuth - note: Pi says subscription use of third-party tools bills as per-token "extra usage")
  3. Reuse your own Pi login:  PI_USE_HOME=1 PI_MODEL=$PI_MODEL $0
MSG
    exit 1
  fi
fi
