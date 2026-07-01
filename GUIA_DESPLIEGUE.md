# Guía de despliegue en producción

Cómo publicar BarahundaApp (backend Node/Express + MySQL + frontend React) en un
servidor público, de bajo costo y con buenas prácticas de seguridad.

## 1. Qué vas a necesitar

| Ítem | Costo aproximado | Notas |
|---|---|---|
| VPS (servidor virtual) | US$4,54/mes (plan recomendado) | Ver sección 2 — OVHcloud VPS-1 |
| Dominio propio | US$10–15/año | Ej. `tuescuela.com`, en Namecheap, Cloudflare Registrar, etc. |
| Certificado SSL | Gratis | Let's Encrypt, se renueva solo |

No necesitas hosting compartido ni servicios separados para frontend/backend/base de
datos: un solo VPS pequeño alcanza perfectamente para una escuela de música (tráfico
bajo, pocos usuarios concurrentes). Esta guía usa **OVHcloud** específicamente: su
plan VPS-1 (2 vCores, 4 GB RAM, 40 GB SSD NVMe) cuesta desde US$4,54/mes con pago
anual e incluye backup diario y protección anti-DDoS sin costo extra. Es comparable en
specs y precio a Hetzner Cloud (CX22, ≈€4,35/mes), otra alternativa económica si
quieres comparar.

## 2. Crear el VPS en OVHcloud

### 2.1 Crear la cuenta

Entra a [ovhcloud.com](https://www.ovhcloud.com/) (o la versión de tu país/región, ej.
`us.ovhcloud.com`) → **Crear una cuenta**. Te van a pedir un método de pago para
verificarla; no se cobra nada hasta que confirmes un pedido.

### 2.2 Generar una llave SSH en tu computador (Windows)

Es más seguro entrar al servidor con una llave SSH que con contraseña. Windows 10/11
ya trae el cliente OpenSSH integrado. Abre **PowerShell** y ejecuta:

```powershell
ssh-keygen -t ed25519 -C "tu_correo@ejemplo.com"
```

Presiona Enter para aceptar la ubicación por defecto (`C:\Users\TU_USUARIO\.ssh\id_ed25519`)
y, opcionalmente, define una contraseña para la llave. Luego copia la llave **pública**:

```powershell
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub | Set-Clipboard
```

Esto la deja copiada en el portapapeles, lista para pegar en el paso siguiente.

### 2.3 Elegir y configurar el VPS

Ve a la sección **VPS** del sitio y haz clic en **Configurar** sobre el plan que
quieras:

| Plan | Costo aprox. | vCores | RAM | Disco | Ancho de banda |
|---|---|---|---|---|---|
| **VPS-1 (recomendado)** | desde US$4,54/mes | 2 | 4 GB | 40 GB SSD NVMe | 200 Mbps |
| VPS-2 | desde US$8,50/mes | 4 | 8 GB | 75 GB SSD NVMe | 400 Mbps |
| VPS-3 | desde US$12,32/mes | 6 | 12 GB | 100 GB SSD NVMe | 1 Gbps |
| VPS-4 | desde US$23,37/mes | 8 | 24 GB | 200 GB SSD NVMe | 1,5 Gbps |

> Precios de referencia del configurador de OVHcloud (us.ovhcloud.com/vps) con pago
> anual por adelantado; el plan mes a mes sin compromiso puede costar un poco más —
> confirma el valor exacto antes de pagar. Los 4 planes incluyen backup diario
> automático y protección anti-DDoS sin costo adicional.

Con **VPS-1** te sobra memoria para Node + MySQL + Nginx corriendo juntos (el doble de
RAM que el plan equivalente de otros proveedores, a menor costo); solo pasa a un plan
mayor si esperas mucho tráfico o quieres más margen.

Dentro de la configuración del pedido:

1. **Sistema operativo / Distribución:** Ubuntu 22.04 LTS.
2. **Datacenter:** elige el más cercano. OVHcloud no tiene datacenter en Sudamérica,
   así que uno en EE.UU. (ej. Vint Hill, Virginia) suele dar la menor latencia desde
   Colombia. Revisa también si el configurador ofrece alguna "VPS Local Zone" más
   cercana en el momento de tu pedido.
3. **Ciclo de facturación:** mensual (más flexible) o 12 meses (precio más bajo, el
   que se muestra en la tabla arriba).
4. **Llave SSH:** si el formulario de pedido te permite pegar una llave pública, pega
   la que copiaste en el paso 2.2. Si no aparece esa opción en tu flujo de compra, no
   pasa nada — recibirás una contraseña de root por correo o en el Panel de Control y
   la reemplazas por tu llave en el paso 2.5.
5. Confirma el pedido y paga.

### 2.4 Ubicar tu servidor

El VPS queda listo en pocos minutos. Encuentra la IP pública y las credenciales en el
**Panel de Control de OVHcloud → Bare Metal Cloud → VPS** (o "Mis servicios" → tu
VPS).

### 2.5 Conectarte por SSH

Si pudiste subir tu llave durante el pedido, conéctate directo:

```powershell
ssh root@TU_IP_DEL_SERVIDOR
```

Si en cambio te asignaron una contraseña de root, conéctate con ella primero y
reemplázala enseguida por tu llave para no depender más de la contraseña:

```bash
ssh root@TU_IP_DEL_SERVIDOR   # te pedirá la contraseña que recibiste
# ya dentro del servidor:
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "PEGA_AQUI_TU_LLAVE_PUBLICA_COMPLETA" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

(El texto que pegas es el contenido completo del archivo `.pub` que copiaste en el
paso 2.2.) Si por algún motivo SSH no responde, el Panel de Control también ofrece una
**consola KVM integrada**: acceso directo a la pantalla del servidor desde el
navegador, sin pasar por SSH.

### 2.6 Protección de red ya incluida

OVHcloud activa protección **anti-DDoS** automática en todos sus VPS, sin
configuración adicional — cubre ataques de volumen contra tu servidor. Esto **no**
reemplaza el firewall interno (`ufw`, sección 3.2): el anti-DDoS filtra tráfico
malicioso masivo, pero decidir quién puede conectarse a qué puerto sigue siendo
trabajo de `ufw` dentro del propio servidor.

## 3. Preparar el servidor (dentro del VPS)

### 3.1 Actualizar el sistema y crear un usuario sin privilegios root

Nunca operes el día a día como `root`. Crea un usuario aparte:

```bash
apt update && apt upgrade -y
adduser barahunda
usermod -aG sudo barahunda
rsync --archive --chown=barahunda:barahunda ~/.ssh /home/barahunda
```

El último comando copia tu llave SSH al nuevo usuario para que también puedas entrar
como `barahunda` sin contraseña. Cierra la sesión y vuelve a entrar como `barahunda`
para todo lo siguiente (`ssh barahunda@TU_IP_DEL_SERVIDOR`).

### 3.2 Firewall interno (ufw)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 3.3 Protección contra fuerza bruta en SSH (opcional pero recomendado)

```bash
sudo apt install fail2ban -y
sudo systemctl enable --now fail2ban
```

### 3.4 Si tu plan tiene poca RAM: agrega swap

Con los 4 GB de RAM del VPS-1 no debería hacer falta, pero si en el futuro bajas de
plan o notas que MySQL se queda sin memoria en picos de uso, un archivo de swap evita
que el sistema se caiga (será más lento en esos picos, pero no se romperá):

```bash
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 4. Instalar el software base

```bash
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# MySQL
sudo apt install -y mysql-server

# Nginx (reverse proxy + servidor del frontend)
sudo apt install -y nginx

# PM2 (mantiene el backend corriendo y lo reinicia si se cae o si el servidor reinicia)
sudo npm install -g pm2
```

### 4.1 Configurar MySQL de forma segura

```bash
sudo mysql_secure_installation
```

Responde "sí" a todo (quitar usuarios anónimos, deshabilitar login remoto de root,
quitar la base de prueba). Luego crea una base y un usuario dedicado **solo para esta
app** (nunca uses el usuario `root` de MySQL en el `.env`):

```bash
sudo mysql -u root -p
```

```sql
CREATE DATABASE escuela_musica CHARACTER SET utf8mb4;
CREATE USER 'barahunda_app'@'localhost' IDENTIFIED BY 'UNA_CONTRASEÑA_LARGA_Y_UNICA';
GRANT ALL PRIVILEGES ON escuela_musica.* TO 'barahunda_app'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Nota el `'localhost'` en el usuario: MySQL solo aceptará conexiones desde el propio
servidor, nunca desde internet, aunque alguien lograra esquivar el firewall interno
(`ufw`, sección 3.2).

El esquema (`database.sql`) todavía no existe en el servidor en este punto — se carga
en la sección 5, una vez subido el código.

## 5. Subir el código al servidor

Lo más simple es usar Git (si tienes el código en un repositorio privado en GitHub/
GitLab) o `scp` para copiar la carpeta directamente. Antes de cualquiera de las dos
opciones, asegúrate de que la carpeta destino exista y sea tuya (evita el error
`Permission denied` si `/home/barahunda` todavía no existe o no te pertenece):

```bash
sudo mkdir -p /home/barahunda/app
sudo chown -R barahunda:barahunda /home/barahunda/app
```

```bash
# Opción A: con git (recomendado, facilita actualizaciones futuras)
cd /home/barahunda/app
git clone TU_REPOSITORIO.git .

# Opción B: copiar desde tu computador (PowerShell, en TU máquina, no en el VPS)
scp -r .\app\* barahunda@TU_IP_DEL_SERVIDOR:/home/barahunda/app
```

## 6. Configurar las variables de entorno de producción

```bash
cd /home/barahunda/app/server
cp .env.example .env
nano .env
```

Valores que **debes cambiar** respecto a desarrollo:

```bash
NODE_ENV=production

DB_HOST=localhost
DB_USER=barahunda_app
DB_PASSWORD=LA_CONTRASEÑA_QUE_CREASTE_EN_MYSQL
DB_NAME=escuela_musica

# Genera secretos nuevos y largos, distintos a los de desarrollo. Por ejemplo:
# openssl rand -hex 32
JWT_SECRET=GENERA_UNO_NUEVO_AQUI
ASISTENCIA_TOKEN_SECRET=GENERA_OTRO_NUEVO_AQUI

# Tu dominio real, con https
FRONTEND_URL=https://tuescuela.com
```

> **¿Todavía no tienes dominio?** Usa [nip.io](https://nip.io/), un servicio gratis
> que convierte tu IP pública en un dominio real (ej. `203.0.113.1.nip.io` si tu IP es
> `203.0.113.1`). Como es un dominio de verdad, en la sección 10 sí podrás sacarle un
> certificado Let's Encrypt normal — algo que no es posible apuntando solo a la IP.
> Cuando compres tu dominio definitivo, cambia esta variable y vuelve a correr certbot
> con el dominio nuevo.

Genera los secretos así (ejecuta dos veces, uno para cada variable):

```bash
openssl rand -hex 32
```

El archivo `.env` **nunca** debe subirse a Git ni compartirse — ya está excluido en
`.gitignore`. Es la única copia de tus credenciales de producción.

```bash
npm install --omit=dev
```

## 7. Construir el frontend

```bash
cd /home/barahunda/app/client
cp .env.example .env
```

Edita `client/.env` para que apunte a tu propio dominio (revisa qué variable usa,
normalmente `VITE_API_URL=https://tuescuela.com/api`).

```bash
npm install
npm run build
```

Esto genera la carpeta `client/dist` con los archivos estáticos finales (HTML/CSS/JS),
que Nginx servirá directamente — no necesitas Node corriendo para el frontend.

## 8. Levantar el backend con PM2

```bash
cd /home/barahunda/app/server
pm2 start server.js --name barahunda-api
pm2 save
pm2 startup   # te da un comando "sudo env PATH=... pm2 startup..." — ejecútalo
```

Esto deja el backend corriendo en `localhost:4000`, y PM2 se encarga de reiniciarlo si
se cae o si el servidor se reinicia.

Comandos útiles para el día a día:

```bash
pm2 status              # ver si está corriendo
pm2 logs barahunda-api  # ver logs en vivo
pm2 restart barahunda-api
```

## 9. Configurar Nginx como puerta de entrada

Crea el archivo de configuración del sitio:

```bash
sudo nano /etc/nginx/sites-available/barahunda
```

Cambia `tuescuela.com www.tuescuela.com` por tu dominio real. **Si todavía no tienes
dominio y estás usando nip.io (sección 6), pon aquí ese mismo hostname** (ej.
`server_name 203.0.113.1.nip.io;`, sin `www`, ya que ese subdominio no aplica con
nip.io) — si lo dejas con el valor de ejemplo, Nginx no reconocerá las peticiones a tu
IP/nip.io y caerás en la página por defecto de Nginx ("Welcome to nginx!") en vez de tu
app:

```nginx
server {
    listen 80;
    server_name tuescuela.com www.tuescuela.com;

    # Frontend: archivos estáticos del build de React
    root /home/barahunda/app/client/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend: todo lo que empiece en /api se reenvía a Express en el puerto 4000
    location /api/ {
        proxy_pass http://localhost:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Archivos subidos (logos, soportes de pago)
    location /uploads/ {
        proxy_pass http://localhost:4000/uploads/;
    }
}
```

Activa el sitio y recarga Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/barahunda /etc/nginx/sites-enabled/
sudo nginx -t        # valida que no haya errores de sintaxis
sudo systemctl reload nginx
```

Antes de seguir, apunta tu dominio al VPS: en el panel de tu registrador de dominio
(Namecheap, Cloudflare, etc. — no es necesario usar el DNS de OVHcloud, aunque también
puedes gestionarlo ahí mismo si compraste o transferiste el dominio a OVHcloud), crea
un registro `A` con el nombre `@` y otro `www`, ambos apuntando a la IP pública de tu
VPS. Puede tardar unos minutos a unas horas en propagarse.

## 10. Activar HTTPS gratis (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tuescuela.com -d www.tuescuela.com
```

Certbot edita automáticamente la configuración de Nginx para servir HTTPS y redirigir
todo el tráfico HTTP a HTTPS. El certificado vence cada 90 días, pero Certbot instala
un temporizador que lo renueva solo — no tienes que hacer nada más. Puedes confirmarlo
con:

```bash
sudo systemctl status certbot.timer
```

A partir de aquí tu app queda disponible en `https://tuescuela.com`.

## 11. Después de publicar: el enlace fijo del punto de registro

El enlace fijo del punto de registro (sección **Configuración → Punto de registro fijo**)
se construye con `FRONTEND_URL`. Como cambiaste esa variable a tu dominio real en el
paso 6, el enlace que verás ahí ya apuntará a `https://tuescuela.com/asistencia?token=...`.

Antes de entregar ese enlace al dispositivo físico de la sede:

1. Entra a Configuración con tu usuario admin ya en producción.
2. Copia el enlace fijo (botón "Copiar enlace").
3. Ábrelo en el navegador de la tablet/dispositivo del punto de registro y guárdalo
   como marcador o pantalla de inicio — no lo envíes por WhatsApp ni correo a los
   miembros.
4. Si el enlace se filtra alguna vez, usa "Regenerar enlace" para invalidar el
   anterior de inmediato y vuelve a entregarlo solo al dispositivo.

## 12. Backups

Programa un volcado diario de la base de datos. Crea el script:

```bash
mkdir -p /home/barahunda/backups
nano /home/barahunda/backup.sh
```

```bash
#!/bin/bash
FECHA=$(date +%F)
mysqldump -u barahunda_app -p'LA_CONTRASEÑA_QUE_CREASTE_EN_MYSQL' escuela_musica \
  > /home/barahunda/backups/escuela_musica_$FECHA.sql
find /home/barahunda/backups -name "*.sql" -mtime +14 -delete
```

```bash
chmod +x /home/barahunda/backup.sh
crontab -e
```

Agrega esta línea para correrlo todas las noches a la 1 a.m.:

```
0 1 * * * /home/barahunda/backup.sh
```

Esto guarda 14 días de respaldos locales y borra los más viejos automáticamente. Para
mayor seguridad, descarga esos `.sql` periódicamente a tu computador o a un
almacenamiento externo. OVHcloud además incluye, sin costo adicional, un backup diario
automático de todo el VPS (lo ves en el Panel de Control): es un respaldo del servidor
completo, no un sustituto del volcado de base de datos de arriba — te permite
restaurar solo los datos de un día específico sin tocar el resto del servidor.

## 13. Actualizar la app en el futuro

Cuando hagas cambios en el código:

```bash
cd /home/barahunda/app
git pull

cd server && npm install --omit=dev && pm2 restart barahunda-api
cd ../client && npm install && npm run build
```

No es necesario reiniciar Nginx (sirve los archivos de `dist/` directamente; el nuevo
build los reemplaza).

## 14. Resumen de seguridad

- MySQL y el backend (puerto 4000) **no** están expuestos a internet — `ufw` (sección
  3.2) bloquea todo excepto SSH, 80 y 443. La protección anti-DDoS de OVHcloud
  (sección 2.6) cubre un riesgo distinto (ataques de volumen), no sustituye este
  firewall interno.
- Acceso SSH por llave, no por contraseña.
- Usuario de MySQL dedicado a la app, sin privilegios sobre otras bases.
- `JWT_SECRET` y `ASISTENCIA_TOKEN_SECRET` generados de nuevo para producción
  (nunca reutilices los de desarrollo).
- HTTPS obligatorio (Let's Encrypt, renovación automática).
- `fail2ban` contra intentos de fuerza bruta por SSH.
- El enlace fijo del punto de registro nunca se comparte con los miembros — solo vive
  en el dispositivo físico de la sede (ver sección 11).
- Backups diarios de la base de datos (sección 12), más el backup diario automático de
  todo el VPS que OVHcloud incluye sin costo adicional.
- Cambia la contraseña del usuario admin por defecto (`admin@escuela.com` /
  `Admin123*`) en el primer ingreso a producción, si todavía no lo has hecho.

## Fuentes consultadas (precios y procedimientos, junio 2026)

- [OVHcloud — VPS: planes, precios y especificaciones](https://us.ovhcloud.com/vps/)
- [OVHcloud — Getting started with a VPS](https://support.us.ovhcloud.com/hc/en-us/articles/360009253639-Getting-started-with-a-VPS)
- [OVHcloud — How to install an SSL certificate on a VPS](https://support.us.ovhcloud.com/hc/en-us/articles/43691505963027-How-to-install-an-SSL-certificate-on-a-VPS)
- [Hetzner Cloud — Cost-optimized servers](https://www.hetzner.com/cloud/cost-optimized)
