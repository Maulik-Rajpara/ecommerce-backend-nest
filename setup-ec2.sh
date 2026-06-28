#!/bin/bash
set -e  # exit immediately if any command fails

# ══════════════════════════════════════════════════════════════════
# EC2 Ubuntu Server Setup Script
# Run once after launching a fresh Ubuntu 22.04 EC2 instance.
#
# What this does:
#   1. Install Node.js 20, npm
#   2. Install Docker + Docker Compose
#   3. Install nginx (reverse proxy)
#   4. Clone the repo
#   5. Set up .env file
#   6. Start infrastructure (postgres, redis, kafka, ngrok) via Docker
#   7. Build and start the NestJS app
#   8. Configure nginx to proxy port 80 → 3000
# ══════════════════════════════════════════════════════════════════

REPO_URL="https://github.com/YOUR_USERNAME/YOUR_REPO.git"   # ← change this
APP_DIR="/home/ubuntu/ecommerce-backend-nest"
APP_USER="ubuntu"

echo "===> Updating system packages..."
sudo apt-get update -y && sudo apt-get upgrade -y

# ── NODE.JS 20 ──────────────────────────────────────────────────
echo "===> Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v && npm -v

# ── DOCKER ──────────────────────────────────────────────────────
echo "===> Installing Docker..."
sudo apt-get install -y ca-certificates curl gnupg lsb-release
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Allow ubuntu user to run docker without sudo
sudo usermod -aG docker $APP_USER
echo "===> Docker installed. NOTE: log out and back in for docker group to take effect."
echo "     For now, script will use 'sudo docker' ..."

# ── NGINX ───────────────────────────────────────────────────────
echo "===> Installing nginx..."
sudo apt-get install -y nginx

# ── CLONE REPO ──────────────────────────────────────────────────
echo "===> Cloning repository..."
if [ -d "$APP_DIR" ]; then
  echo "Directory already exists — pulling latest code..."
  git -C "$APP_DIR" pull origin maulik-dev
else
  git clone "$REPO_URL" "$APP_DIR"
fi

# ── .ENV FILE ───────────────────────────────────────────────────
echo "===> Setting up .env file..."
if [ ! -f "$APP_DIR/.env" ]; then
  echo "ERROR: .env file not found at $APP_DIR/.env"
  echo "Please upload your .env file to $APP_DIR/.env and re-run this script."
  echo "You can use: scp -i your-key.pem .env ubuntu@<EC2-IP>:$APP_DIR/.env"
  exit 1
fi
echo ".env file found."

# ── START DOCKER INFRASTRUCTURE ─────────────────────────────────
echo "===> Starting infrastructure (postgres, redis, kafka, ngrok)..."
cd "$APP_DIR"
sudo docker compose up -d
echo "Waiting 30s for Kafka to fully start..."
sleep 30

# ── INSTALL DEPS + BUILD ─────────────────────────────────────────
echo "===> Installing npm dependencies..."
cd "$APP_DIR"
npm install

echo "===> Building NestJS app..."
npm run build

# ── RUN MIGRATIONS ───────────────────────────────────────────────
echo "===> Running database migrations..."
npm run migration:run:prod

# ── START APP ───────────────────────────────────────────────────
echo "===> Starting NestJS app..."
# Install pm2 globally to keep the app running after SSH disconnect
sudo npm install -g pm2
pm2 start dist/main.js --name ecommerce-api
pm2 save
pm2 startup | tail -1 | sudo bash   # register pm2 to auto-start on reboot

# ── NGINX CONFIG ────────────────────────────────────────────────
echo "===> Configuring nginx reverse proxy..."
sudo tee /etc/nginx/sites-available/ecommerce > /dev/null <<'NGINX'
server {
    listen 80;
    server_name _;   # replace _ with your domain or EC2 public IP

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/ecommerce /etc/nginx/sites-enabled/ecommerce
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

echo ""
echo "══════════════════════════════════════════════════"
echo "  Setup complete!"
echo ""
echo "  App running on:    http://$(curl -s ifconfig.me)"
echo "  PM2 status:        pm2 status"
echo "  App logs:          pm2 logs ecommerce-api"
echo "  Docker status:     sudo docker compose ps"
echo "══════════════════════════════════════════════════"
