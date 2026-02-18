#!/usr/bin/env bash
set -euo pipefail

REPO="https://github.com/osipov-anton/connectclaw.git"
INSTALL_DIR="${CONNECTCLAW_DIR:-$HOME/connectclaw}"

BOLD="\033[1m"
DIM="\033[2m"
GREEN="\033[32m"
CYAN="\033[36m"
YELLOW="\033[33m"
RED="\033[31m"
RESET="\033[0m"

prompt() {
  local var="$1" msg="$2"
  read -rp "$(echo -e "${CYAN}▸${RESET} ${msg}")" "$var" </dev/tty
}

choose() {
  local var="$1" msg="$2"
  shift 2
  local options=("$@")
  echo -e "\n${CYAN}▸${RESET} ${msg}"
  for i in "${!options[@]}"; do
    echo -e "  ${BOLD}$((i+1)))${RESET} ${options[$i]}"
  done
  while true; do
    read -rp "$(echo -e "  ${DIM}Choice [1-${#options[@]}]:${RESET} ")" choice </dev/tty
    if [[ "$choice" =~ ^[0-9]+$ ]] && (( choice >= 1 && choice <= ${#options[@]} )); then
      eval "$var=$((choice))"
      return
    fi
    echo -e "  ${RED}Invalid choice, try again.${RESET}"
  done
}

echo ""
echo -e "${BOLD}  ╔══════════════════════════════════════╗${RESET}"
echo -e "${BOLD}  ║       ConnectClaw Relay Installer     ║${RESET}"
echo -e "${BOLD}  ╚══════════════════════════════════════╝${RESET}"
echo ""

# --- Check Docker ---

if ! command -v docker &>/dev/null; then
  echo -e "${RED}✗${RESET} Docker is not installed."
  echo -e "  Install it: ${DIM}https://docs.docker.com/engine/install/${RESET}"
  exit 1
fi
echo -e "${GREEN}✓${RESET} Docker found"

if ! docker compose version &>/dev/null; then
  echo -e "${RED}✗${RESET} Docker Compose V2 is not available."
  echo -e "  Install it: ${DIM}https://docs.docker.com/compose/install/${RESET}"
  exit 1
fi
echo -e "${GREEN}✓${RESET} Docker Compose found"

# --- Interactive or env-var mode ---

DOMAIN="${RELAY_HOST:-}"
ACCESS_TOKEN="${RELAY_ACCESS_TOKEN:-}"
USE_SSL=""

if [ -n "$DOMAIN" ]; then
  USE_SSL="yes"
  echo ""
  echo -e "${DIM}Using env vars: RELAY_HOST=$DOMAIN${RESET}"
else
  # Ask about domain
  choose MODE "Do you have a domain pointed to this server?" \
    "Yes — set up with HTTPS (Caddy + Let's Encrypt)" \
    "No  — run on port 3000 without HTTPS (for dev/testing)"

  if [ "$MODE" -eq 1 ]; then
    USE_SSL="yes"
    echo ""
    prompt DOMAIN "Enter your domain (e.g. relay.example.com): "
    if [ -z "$DOMAIN" ]; then
      echo -e "\n${RED}✗${RESET} Domain cannot be empty."
      exit 1
    fi
  else
    USE_SSL="no"
    DOMAIN="localhost"
  fi

  # Ask about access token
  choose TOKEN_MODE "Relay access mode:" \
    "Open  — anyone can sign up" \
    "Private — require an access token to sign up"

  if [ "$TOKEN_MODE" -eq 2 ]; then
    echo ""
    prompt ACCESS_TOKEN "Enter access token: "
    if [ -z "$ACCESS_TOKEN" ]; then
      echo -e "\n${RED}✗${RESET} Access token cannot be empty."
      exit 1
    fi
  fi
fi

# --- Summary ---

echo ""
echo -e "${BOLD}  Configuration:${RESET}"
if [ "$USE_SSL" = "yes" ]; then
  echo -e "    Domain:  ${GREEN}$DOMAIN${RESET}"
  echo -e "    HTTPS:   ${GREEN}Yes${RESET} (Caddy + Let's Encrypt)"
else
  echo -e "    Mode:    ${YELLOW}Local / dev${RESET} (port 3000, no HTTPS)"
fi
if [ -n "$ACCESS_TOKEN" ]; then
  echo -e "    Access:  ${YELLOW}Private${RESET} (token required)"
else
  echo -e "    Access:  ${GREEN}Open${RESET} (anyone can sign up)"
fi
echo ""

prompt CONFIRM "Proceed with installation? [Y/n]: "
if [[ "$CONFIRM" =~ ^[Nn] ]]; then
  echo -e "\n${DIM}Aborted.${RESET}"
  exit 0
fi

# --- Clone or update ---

echo ""
if [ -d "$INSTALL_DIR" ]; then
  echo -e "${CYAN}↻${RESET} Updating existing installation at ${DIM}$INSTALL_DIR${RESET}..."
  cd "$INSTALL_DIR"
  git pull --ff-only
else
  echo -e "${CYAN}↓${RESET} Cloning ConnectClaw to ${DIM}$INSTALL_DIR${RESET}..."
  git clone "$REPO" "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

cd packages/relay

# --- Create .env ---

cat > .env <<EOF
RELAY_HOST=$DOMAIN
DATABASE_URL=file:/app/data/connectclaw.db
RELAY_ACCESS_TOKEN=$ACCESS_TOKEN
EOF
echo -e "${GREEN}✓${RESET} Created .env"

# --- Start ---

if [ "$USE_SSL" = "yes" ]; then
  sed "s/{DOMAIN}/$DOMAIN/g" Caddyfile.template > Caddyfile
  echo -e "${GREEN}✓${RESET} Created Caddyfile for ${BOLD}$DOMAIN${RESET}"

  echo ""
  echo -e "${CYAN}▸${RESET} Starting relay with HTTPS..."
  docker compose --profile ssl up -d --build

  RELAY_URL="https://$DOMAIN"
  COMPOSE_CMD="docker compose --profile ssl"
else
  echo ""
  echo -e "${CYAN}▸${RESET} Starting relay..."
  docker compose up -d --build

  RELAY_URL="http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo 'localhost'):3000"
  COMPOSE_CMD="docker compose"
fi

# --- Done ---

echo ""
echo -e "${BOLD}${GREEN}  ✓ ConnectClaw relay is running!${RESET}"
echo ""
echo -e "  ${BOLD}URL:${RESET}     $RELAY_URL"
echo -e "  ${BOLD}Data:${RESET}    Docker volume 'relay-data'"
if [ "$USE_SSL" = "yes" ]; then
  echo -e "  ${BOLD}Certs:${RESET}   Auto-provisioned by Let's Encrypt via Caddy"
fi
echo ""
echo -e "  ${DIM}Commands:${RESET}"
echo -e "    Logs:    cd $INSTALL_DIR/packages/relay && $COMPOSE_CMD logs -f"
echo -e "    Stop:    cd $INSTALL_DIR/packages/relay && $COMPOSE_CMD down"
echo -e "    Update:  curl -fsSL https://raw.githubusercontent.com/osipov-anton/connectclaw/main/packages/relay/install.sh | bash"
echo ""
echo -e "  ${BOLD}Configure your OpenClaw plugin:${RESET}"
echo -e "    openclaw config set plugins.entries.connectclaw.config.relayUrl \"$RELAY_URL\""
echo ""
