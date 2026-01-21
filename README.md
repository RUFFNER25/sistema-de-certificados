# Sistema de Gestión de Certificados

Aplicación full‑stack para gestionar certificados en PDF.  
Incluye:

- **Frontend**: React + Vite  
- **Backend**: Node.js + Express  
- **Base de datos**: PostgreSQL  

Hay dos vistas:

- **Pública (`/`)**: buscador de certificados por DNI (o nombre).
- **Admin (`/admin`)**: carga de nuevos certificados (PDF + nombre + DNI) y listado administrativo.

---

## 1. Requisitos previos

- Node.js 18+  
- npm 9+  
- PostgreSQL 13+ (o superior)

---

## 2. Clonar el proyecto

```bash
git clone <URL_DE_TU_REPO>.git
cd "sistema de certficados"
```

> Nota: la carpeta del proyecto se llama literalmente `sistema de certficados` (sin la segunda “i”).

---

## 3. Configurar PostgreSQL

1. Crear la base de datos:

```bash
createdb sistema_certificados
```

2. Opcional pero recomendado: definir la variable de entorno `DATABASE_URL` para el backend.

Ejemplo en macOS / Linux (bash/zsh):

```bash
export DATABASE_URL="postgres://USUARIO:CONTRASEÑA@localhost:5432/sistema_certificados"
```

Si **no** defines `DATABASE_URL`, el backend usará por defecto:

```text
postgres://postgres:postgres@localhost:5432/sistema_certificados
```

Asegúrate de que ese usuario/contraseña existan en tu instalación de Postgres.

> La tabla `certificados` se crea automáticamente al iniciar el backend.

---

## 4. Instalación de dependencias

En la raíz del proyecto hay un `package.json` para orquestar frontend y backend.

1. Instalar utilidades de la raíz:

```bash
cd "sistema de certficados"
npm install
```

2. Instalar dependencias del backend:

```bash
cd backend
npm install
```

3. Instalar dependencias del frontend:

```bash
cd ../frontend
npm install
```

---

## 5. Ejecutar en desarrollo

### Opción A – Frontend y backend por separado

En una terminal (backend):

```bash
cd "sistema de certficados/backend"
npm run dev
```

Esto levanta el backend en:

- `http://localhost:4000`

En otra terminal (frontend):

```bash
cd "sistema de certficados/frontend"
npm run dev
```

Frontend por defecto en:

- `http://localhost:5173`

### Opción B – Script combinado desde la raíz

En la raíz del proyecto:

```bash
cd "sistema de certficados"
npm run dev
```

Esto ejecuta en paralelo:

- `npm run dev:backend` (en `backend`)
- `npm run dev:frontend` (en `frontend`)

---

## 6. Uso de la aplicación

### Vista pública (buscador)

- URL: `http://localhost:5173/`
- Ingresa un **DNI** (o nombre parcial) y pulsa **Buscar**.
- Los resultados mostrarán:
  - Nombre
  - DNI
  - Fecha de emisión
  - Enlace para **ver/descargar el PDF** (servido por el backend en `/files/...`).

### Panel administrador

- URL: `http://localhost:5173/admin`
- Permite:
  - Buscar certificados por nombre o DNI.
  - Ver la lista de certificados existentes.
  - Crear un nuevo certificado cargando:
    - **Nombre del titular**
    - **DNI**
    - **Archivo PDF** (obligatorio)

Los PDFs se guardan en el directorio:

```text
backend/uploads
```

El nombre real del archivo se guarda en la tabla `certificados` junto con `nombre`, `dni` y `creado_en`.

---

## 7. Variables importantes

Backend (`backend/server.js`):

- `PORT`  
  - Puerto del backend (por defecto `4000`).
- `DATABASE_URL`  
  - Cadena de conexión a PostgreSQL.  
  - Formato típico:  
    `postgres://usuario:password@host:puerto/base_de_datos`

Frontend:

- Actualmente el frontend asume que el backend corre en `http://localhost:4000`.  
  Si lo despliegas en otra URL o puerto, actualiza la constante `API_BASE` en:

```text
frontend/src/App.jsx
```

Ejemplo:

```js
const API_BASE = 'https://mi-dominio.com';
```

---

## 8. Build para producción (solo frontend)

Para generar el build del frontend (por ejemplo, para servirlo con otro servidor):

```bash
cd "sistema de certficados/frontend"
npm run build
```

El resultado quedará en `frontend/dist`.

> El backend actualmente está pensado para funcionar separado del build de frontend, pero puede adaptarse fácilmente para servir los archivos estáticos de `dist` si lo necesitas.

---

## 9. Notas para tu colega

- Asegúrate de:
  - Tener PostgreSQL corriendo.
  - Crear la base `sistema_certificados`.
  - Exportar `DATABASE_URL` si usas credenciales distintas a `postgres:postgres`.
- Luego basta con:

```bash
cd "sistema de certficados"
npm install
cd backend && npm install
cd ../frontend && npm install
# en dos terminales
cd ../backend && npm run dev
cd ../frontend && npm run dev
```

Con eso debería poder levantar exactamente el mismo entorno que tú.


