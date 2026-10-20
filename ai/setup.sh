#!/usr/bin/env bash
# RateDays — set up this Linux machine (e.g. Ubuntu Server) as the AI that writes your recaps.
#
# What it does:
#   1. Installs Ollama (the local AI server) as a system service, if it's missing.
#   2. Lets the RateDays website talk to it from your phone's browser.
#   3. Downloads an AI model that runs well on a gaming laptop's GPU.
#   4. Installs Tailscale if needed and gives the AI an https address your phone can reach.
#
# Run it (over SSH is fine):
#   curl -fsSL https://raw.githubusercontent.com/Hudsoonvid/Rate-Days/main/ai/setup.sh | sudo bash
# Optional overrides:
#   curl -fsSL …/setup.sh | sudo RATEDAYS_MODEL=qwen2.5:14b RATEDAYS_SITE=https://example.com bash
#
# Safe to run again; it just re-applies the settings.

set -euo pipefail

# Everything lives in main() so bash reads the whole script before running any of it
# (important when it's piped from curl).
main() {
  local model="${RATEDAYS_MODEL:-llama3.1:8b}"
  local site="${RATEDAYS_SITE:-https://hudsoonvid.github.io}"
  site="${site%/}"
  local api="http://127.0.0.1:11434"

  if [ "$(id -u)" -ne 0 ]; then
    echo "Please run it with sudo:"
    echo "  curl -fsSL https://raw.githubusercontent.com/Hudsoonvid/Rate-Days/main/ai/setup.sh | sudo bash"
    exit 1
  fi

  step 1 "Checking for Ollama"
  if ! have ollama; then
    curl -fsSL https://ollama.com/install.sh | sh
  fi
  echo "Ollama is installed."
  warn_if_gpu_driver_missing

  step 2 "Allowing ${site} to use it"
  local env_lines=(
    # Which websites may call the AI from a browser.
    "OLLAMA_ORIGINS=${site}"
    # Listen beyond localhost so Tailscale can forward to it.
    "OLLAMA_HOST=0.0.0.0:11434"
    # Room for a whole season of episodes in one prompt.
    "OLLAMA_CONTEXT_LENGTH=16384"
  )
  printf '  %s\n' "${env_lines[@]}"

  step 3 "Restarting Ollama with the new settings"
  if has_systemd && systemctl cat ollama.service >/dev/null 2>&1; then
    local dir=/etc/systemd/system/ollama.service.d
    mkdir -p "$dir"
    {
      echo "# Written by RateDays ai/setup.sh"
      echo "[Service]"
      for line in "${env_lines[@]}"; do echo "Environment=\"${line}\""; done
    } >"$dir/ratedays.conf"
    systemctl daemon-reload
    systemctl enable ollama >/dev/null 2>&1 || true
    systemctl restart ollama
  else
    # No systemd service (containers, WSL…): run the server in the background instead.
    pkill -x ollama 2>/dev/null || true
    sleep 1
    env "${env_lines[@]}" nohup ollama serve >/var/log/ollama-ratedays.log 2>&1 &
    echo "  (no systemd service found — started 'ollama serve' in the background; re-run this after a reboot)"
  fi
  local up=""
  for _ in $(seq 1 30); do
    if curl -fsS "$api/api/version" >/dev/null 2>&1; then up=1; break; fi
    sleep 1
  done
  if [ -z "$up" ]; then
    echo "Ollama didn't start. Check: journalctl -u ollama --no-pager | tail -n 50"
    exit 1
  fi
  echo "Ollama is running."

  step 4 "Downloading the AI model (about 5 GB, first time only)"
  ollama pull "$model"

  step 5 "Giving it an https address your phone can reach"
  if ! have tailscale; then
    curl -fsSL https://tailscale.com/install.sh | sh
  fi
  if ! tailscale_running; then
    echo "Sign this machine in to Tailscale: open the link below on your phone or laptop."
    tailscale up </dev/null
  fi
  # Serves https://<this-machine>.<tailnet>.ts.net → the AI on port 11434.
  # The first time, Tailscale may print a link to turn on HTTPS for your tailnet.
  tailscale serve --bg 11434 </dev/null

  local dns
  dns="$(tailscale status --json | python3 -c 'import json,sys; print(json.load(sys.stdin)["Self"]["DNSName"].rstrip("."))' 2>/dev/null || true)"

  echo
  if [ -n "$dns" ]; then
    printf '\033[32mDone! Your AI address:  https://%s\033[0m\n' "$dns"
    echo "Make sure Tailscale is installed and signed in on your phone too (same account)."
    echo "On your phone: RateDays > Settings > Connect to AI > paste the address > Connect."
  else
    echo "The AI is ready, but Tailscale didn't report this machine's name."
    echo "Run 'tailscale status' to check it's signed in, then run this setup again."
  fi
}

step() { printf '\n\033[36m[%s/5] %s\033[0m\n' "$1" "$2"; }
have() { command -v "$1" >/dev/null 2>&1; }
has_systemd() { have systemctl && [ -d /run/systemd/system ]; }

tailscale_running() {
  tailscale status --json 2>/dev/null | python3 -c 'import json,sys; sys.exit(0 if json.load(sys.stdin).get("BackendState") == "Running" else 1)' 2>/dev/null
}

warn_if_gpu_driver_missing() {
  # PCI vendor 10de = NVIDIA. Without the driver Ollama still works, just much slower (CPU only).
  if awk '{print substr($2,1,4)}' /proc/bus/pci/devices 2>/dev/null | grep -qi '^10de$' && ! have nvidia-smi; then
    echo "Note: this machine has an NVIDIA GPU but no driver, so the AI will run slowly on the CPU."
    echo "      Install the driver with:  sudo ubuntu-drivers install && sudo reboot   — then run this again."
  fi
}

main "$@"
