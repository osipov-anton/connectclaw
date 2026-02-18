#!/usr/bin/env bash
set -euo pipefail

REPO="https://github.com/osipov-anton/connectclaw.git"
INSTALL_DIR="${CONNECTCLAW_DIR:-$HOME/connectclaw}"

echo "=== ConnectClaw Relay Installer ==="
echo ""

# Check Docker
if ! command -v docker &>/dev/null; then
  echo "Error: Docker is not installed."
  echo "Install it: https://docs.docker.com/engine/install/"
  exit 1
fi

if ! docker compose version &>/dev/null; then
  echo "Error: Docker Compose V2 is not available."
  echo "Install it: https://docs.docker.com/compose/install/"
  exit 1
fi

# Ask for domain
DOMAIN="${RELAY_HOST:-}"
if [ -z "$DOMAIN" ]; then
  read -rp "Domain for the relay (e.g. relay.connectclaw.io): " DOMAIN
fi

if [ -z "$DOMAIN" ]; then
  echo "Error: domain is required."
  exit 1
fi

# Ask for access token (optional)
ACCESS_TOKEN="${RELAY_ACCESS_TOKEN:-}"
if [ -z "$ACCESS_TOKEN" ]; then
  read -rp "Relay access token (leave empty for open relay): " ACCESS_TOKEN
fi

# Clone or update
if [ -d "$INSTALL_DIR" ]; then
  echo "Updating existing installation at $INSTALL_DIR..."
  cd "$INSTALL_DIR"
  git pull --ff-only
else
  echo "Cloning ConnectClaw to $INSTALL_DIR..."
  git clone "$REPO" "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

cd packages/relay

# Create .env
cat > .env <<EOF
RELAY_HOST=$DOMAIN
DATABASE_URL=file:/app/data/connectclaw.db
RELAY_ACCESS_TOKEN=$ACCESS_TOKEN
EOF
echo "Created .env"

# Generate Caddyfile from template
sed "s/{DOMAIN}/$DOMAIN/g" Caddyfile.template > Caddyfile
echo "Created Caddyfile for $DOMAIN (auto-HTTPS via Let's Encrypt)"

# Build and start with SSL profile
echo ""
echo "Starting ConnectClaw relay with HTTPS..."
docker compose --profile ssl up -d --build

echo ""
echo "=== ConnectClaw relay is running ==="
echo ""
echo "  URL:     https://$DOMAIN"
echo "  Data:    Docker volume 'relay-data'"
echo "  Certs:   Auto-provisioned by Let's Encrypt via Caddy"
echo ""
echo "Commands:"
echo "  Logs:    cd $INSTALL_DIR/packages/relay && docker compose --profile ssl logs -f"
echo "  Stop:    cd $INSTALL_DIR/packages/relay && docker compose --profile ssl down"
echo "  Update:  curl -fsSL https://raw.githubusercontent.com/osipov-anton/connectclaw/main/packages/relay/install.sh | bash"
echo ""
echo "Configure your OpenClaw plugin:"
echo "  openclaw config set plugins.entries.connectclaw.config.relayUrl \"https://$DOMAIN\""
