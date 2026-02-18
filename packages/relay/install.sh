#!/usr/bin/env bash
set -euo pipefail

REPO="https://github.com/osipov-anton/connectclaw.git"
INSTALL_DIR="${CONNECTCLAW_DIR:-$HOME/connectclaw}"
PORT="${PORT:-3000}"
RELAY_HOST="${RELAY_HOST:-$(hostname -f 2>/dev/null || echo localhost)}"

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

# Create .env if not exists
if [ ! -f .env ]; then
  cat > .env <<EOF
PORT=$PORT
RELAY_HOST=$RELAY_HOST
DATABASE_URL=file:/app/data/connectclaw.db
RELAY_ACCESS_TOKEN=
EOF
  echo "Created .env (edit to customize)"
fi

# Build and start
echo ""
echo "Starting ConnectClaw relay..."
docker compose up -d --build

echo ""
echo "=== ConnectClaw relay is running ==="
echo "  URL:  http://$RELAY_HOST:$PORT"
echo "  Data: stored in Docker volume 'relay-data'"
echo ""
echo "Commands:"
echo "  Logs:    cd $INSTALL_DIR/packages/relay && docker compose logs -f"
echo "  Stop:    cd $INSTALL_DIR/packages/relay && docker compose down"
echo "  Update:  curl -fsSL <install-url> | bash"
echo ""
echo "Configure your OpenClaw plugin:"
echo "  relayUrl: \"http://$RELAY_HOST:$PORT\""
