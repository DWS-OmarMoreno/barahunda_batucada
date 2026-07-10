# Guía de recuperación — PM2 / Barahunda Batucada

VPS: `51.222.207.76` · Ubuntu 22.04 · Node.js + Nginx  
App dir en el VPS: `/home/barahunda/app`  
Proceso PM2: `barahunda-api`

---

## Caso 1 — Deploy normal (código nuevo)

El script `deploy.sh` hace todo: pull, dependencias, build y reinicio.

```bash
cd /home/barahunda/app
bash deploy.sh
```

Lo que hace internamente:
1. `git pull origin main` — baja el código nuevo
2. `npm install --omit=dev` en `/server` — instala dependencias del backend
3. `npm install && npm run build` en `/client` — genera el build estático
4. `pm2 restart barahunda-api && pm2 status` — reinicia el proceso

---

## Caso 2 — Proceso caído pero PM2 lo recuerda

Si `pm2 list` muestra `stopped` o `errored`:

```bash
pm2 restart barahunda-api
pm2 logs barahunda-api --lines 50   # ver por qué falló
```

---

## Caso 3 — PM2 está vacío (VPS reiniciado sin startup configurado)

```bash
cd /home/barahunda/app/server
pm2 start server.js --name barahunda-api

# Verificar
pm2 list
pm2 logs barahunda-api --lines 30
```

> El frontend es estático (`client/dist/`), Nginx lo sirve directamente.
> No necesita proceso PM2 propio.

---

## Caso 4 — Configurar arranque automático (hacer una sola vez)

Para que PM2 levante `barahunda-api` solo cada vez que el VPS se reinicie:

```bash
# 1. Asegurarse de que el proceso está corriendo
pm2 list

# 2. Generar script de startup
pm2 startup
# PM2 imprime un comando sudo — copiarlo y ejecutarlo tal cual

# 3. Guardar el estado actual
pm2 save
```

Con esto hecho, un reinicio del VPS levanta el proceso automáticamente.

---

## Verificación rápida

```bash
# Backend responde
curl http://localhost:3001/api/configuracion

# Nginx sirve el frontend
curl -I http://localhost

# Ver el .env si hay problemas de puerto
cat /home/barahunda/app/server/.env
```

---

## Nginx

```bash
sudo systemctl status nginx
sudo systemctl restart nginx
sudo nginx -t                            # validar config antes de reiniciar
sudo tail -n 50 /var/log/nginx/error.log
```

---

## MySQL

```bash
sudo systemctl status mysql
sudo systemctl restart mysql
```

---

## Comandos PM2 frecuentes

| Comando | Para qué sirve |
|---------|----------------|
| `pm2 list` | Estado de todos los procesos |
| `pm2 logs barahunda-api` | Logs en tiempo real |
| `pm2 logs barahunda-api --lines 100` | Últimas 100 líneas |
| `pm2 restart barahunda-api` | Reiniciar |
| `pm2 stop barahunda-api` | Detener |
| `pm2 delete barahunda-api` | Eliminar de la lista |
| `pm2 monit` | Monitor visual en tiempo real |
| `pm2 save` | Persistir estado para autoarranque |

---

## Flujo de recuperación mínimo

```
pm2 list → vacío o errored
        ↓
cd /home/barahunda/app/server
pm2 start server.js --name barahunda-api
        ↓
curl http://localhost:3001/api/configuracion  → JSON ✓
        ↓
pm2 save   (para que sobreviva el próximo reinicio)
```
