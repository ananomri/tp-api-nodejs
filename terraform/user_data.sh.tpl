#!/bin/bash
# ============================================
# user_data.sh — bootstrap d'une instance EC2
# Exécuté UNE SEULE FOIS au premier démarrage
# Logs : /var/log/cloud-init-output.log
# ============================================
set -euxo pipefail

# Variables passées par Terraform via templatefile()
APP_REPO="${app_repo}"
APP_BRANCH="${app_branch}"
APP_PORT="${app_port}"
MONGODB_URI="${mongodb_uri}"

# ── 1. Mise à jour système & outils de base ─────────
dnf update -y
dnf install -y git curl tar gzip

# ── 2. Installer Node.js 20 (depuis NodeSource) ─────
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs

# ── 3. Installer PM2 (gestionnaire de processus) ────
npm install -g pm2

# ── 4. Cloner l'application ─────────────────────────
APP_DIR=/opt/app
mkdir -p $APP_DIR
git clone --branch "$APP_BRANCH" "$APP_REPO" $APP_DIR
cd $APP_DIR

# ── 5. Installer les dépendances de production ──────
npm ci --omit=dev

# ── 6. Créer le fichier .env ────────────────────────
cat > $APP_DIR/.env <<EOF
NODE_ENV=production
PORT=$APP_PORT
MONGODB_URI=$MONGODB_URI
EOF
chmod 600 $APP_DIR/.env

# ── 7. Démarrer avec PM2 + activer au boot ──────────
# On utilise ec2-user comme owner pour la sécurité
chown -R ec2-user:ec2-user $APP_DIR

sudo -u ec2-user PM2_HOME=/home/ec2-user/.pm2 \
  pm2 start $APP_DIR/server.js \
  --name academie \
  --cwd $APP_DIR \
  --env production

sudo -u ec2-user PM2_HOME=/home/ec2-user/.pm2 pm2 save

# ── 8. Service systemd : PM2 redémarre au reboot ────
env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd \
  -u ec2-user --hp /home/ec2-user

systemctl enable pm2-ec2-user

# ── 9. Marqueur de fin (utile pour debug) ───────────
echo "✅ Bootstrap terminé à $(date)" > /var/log/bootstrap-done
