# Sistema de Administración de Proceso Educativo Musical

Aplicación web para la administración de una escuela de música: miembros, niveles,
horarios, asistencias, mensualidades, multas, eventos, comunicaciones por WhatsApp,
reportes e importación/exportación de datos.

**Stack:** React (Vite) + React Router v6 + Axios · Node.js + Express · MySQL · JWT

## Estado actual del proyecto

Los 12 módulos del sistema están implementados (backend + frontend):

- ✅ Base de datos completa (`database.sql`) con las 18 tablas de los 12 módulos, relaciones, índices y datos de seed.
- ✅ Backend: conexión a MySQL, middleware de autenticación (JWT), servicio de auditoría global, manejo de errores en español.
- ✅ Módulo **Autenticación** (login/logout).
- ✅ Módulo **Configuración** (datos de la escuela, logo, parámetros operativos, colores dinámicos, auditoría).
- ✅ Módulo **Niveles** y **Horarios**.
- ✅ Módulo **Miembros** (módulo central): datos personales, niveles asignados, contactos de emergencia, pagos, auditoría, recordatorio por WhatsApp.
- ✅ Módulo **Asistencias**: portal público de autoregistro (`/asistencia`, sin login) + panel admin con filtros, contadores y generación automática de multas por tardanza.
- ✅ Módulo **Mensualidades**: estado de pago mensual por miembro, registro de pagos con soporte adjunto, historial, recordatorio por WhatsApp.
- ✅ Módulo **Multas**: listado con filtros, condonación, marcar como pagada, creación manual, resumen de indicadores.
- ✅ Módulo **Eventos**: contrataciones/presentaciones, valor total, contratante, asignación de miembros.
- ✅ Módulo **Comunicaciones**: plantillas de WhatsApp con variables, envío masivo (todos / por nivel / selección manual) e historial.
- ✅ Módulo **Reportes / Dashboard**: KPIs, reportes de mensualidades/asistencia/multas con exportación a Excel y PDF.
- ✅ Módulo **Importación / Exportación**: plantillas Excel descargables (miembros, niveles, horarios, pagos), carga masiva en dos pasos (validar → confirmar) con detalle de errores por fila, exportación de los 9 módulos principales a Excel o CSV, historial de operaciones.
- ✅ Frontend base: `AuthContext`, `ThemeContext` (colores vía CSS Variables), layout principal responsive, componentes reutilizables (`Modal`, `FormField`, `UploadField`, `ConfirmDialog`, `Button`, `AuditLog`, `DataTable`, `StatusBadge`, `WhatsAppButton`, `SubList`).

## Estructura del proyecto

```
/client               React (Vite)
  /src
    /components       Componentes reutilizables (ui/, Layout/)
    /pages            Una carpeta por módulo
    /context          AuthContext, ThemeContext
    /services         Llamadas a la API (axios)
/server               Node.js + Express
  /controllers
  /routes
  /middlewares        auth, auditoria, error, upload
  /models             Consultas SQL
  /utils
  /uploads            Archivos subidos (logos, soportes) — no se versiona
database.sql           Script completo de base de datos
```

## Requisitos previos

- Node.js 18 o superior
- MySQL 8.0+ (o MariaDB 10.5+)

## 1. Crear la base de datos

```bash
mysql -u root -p < database.sql
```

Esto crea la base `escuela_musica`, todas las tablas y los datos iniciales, incluyendo
el usuario administrador:

- **Email:** `admin@escuela.com`
- **Contraseña:** `Admin123*`

> Cambia esta contraseña después del primer inicio de sesión.

## 2. Configurar variables de entorno

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Edita `server/.env` con los datos de tu conexión MySQL y un `JWT_SECRET` propio.

## 3. Backend

```bash
cd server
npm install
npm run dev      # con nodemon, recarga automática
# o: npm start
```

El servidor queda escuchando en `http://localhost:4000` (configurable con `PORT`).
Verifica que está vivo en `GET http://localhost:4000/api/health`.

## 4. Frontend

```bash
cd client
npm install
npm run dev
```

La app queda disponible en `http://localhost:5173` (puerto por defecto de Vite).

## Convenciones del proyecto

- Todas las respuestas de la API siguen la forma `{ success, data, message, pagination }`.
- Fechas en formato colombiano (DD/MM/YYYY) en el frontend, ISO en la API.
- Moneda en formato COP con separador de miles.
- Soft delete: los registros críticos nunca se borran, se marcan con `activo = 0`.
- Auditoría: cada módulo registra sus cambios en la tabla `auditoria` (módulo, acción,
  campo, valor anterior/nuevo, usuario, fecha). El helper está en `server/utils/auditoria.js`
  y se expone en cada request como `req.auditoria` vía el middleware
  `server/middlewares/auditoria.middleware.js`.
