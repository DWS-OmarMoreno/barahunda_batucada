set -e
APP_DIR="/home/barahunda/app"

echo "=== [1/4] Pull ==="
cd "$APP_DIR" && git pull origin main

echo "=== [2/4] Dependencias servidor ==="
cd "$APP_DIR/server" && npm install --omit=dev

echo "=== [3/4] Build cliente ==="
cd "$APP_DIR/client" && npm install && npm run build

echo "=== [4/4] Reinicio PM2 ==="
if pm2 describe barahunda-api > /dev/null 2>&1; then
  pm2 restart barahunda-api
else
  echo "Proceso no encontrado, arrancando desde cero..."
  pm2 start "$APP_DIR/server/server.js" --name barahunda-api
  pm2 save
fi

pm2 status
