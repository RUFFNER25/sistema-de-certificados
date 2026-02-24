# Plan de Corrección: Error de Zona Horaria en Fechas de Certificados

## Información Gathered

### Estructura del proyecto:
- Backend: Node.js + Express + PostgreSQL
- Frontend: React + Vite
- El proyecto maneja fechas de emisión y caducidad de certificados

### Problema identificado:
El servidor usa `new Date().toISOString().slice(0, 10)` para obtener la fecha actual, lo cual usa **UTC**. Cuando el VPS está en UTC y el usuario está en una zona horaria negativa (ej: Perú UTC-5), la comparación de fechas falla y puede guardar un día anterior.

### Archivos afectados:
1. `backend/server.js` - Líneas de validación de fecha en rutas POST y PUT

## Plan (COMPLETADO)

### Paso 1: Corregir la función de obtener fecha actual en el backend ✅
- Se agregó la función `getLocalDate()` que usa `getTimezoneOffset()` para obtener la fecha local del servidor
- Se actualizó la validación en la ruta POST (crear certificado)
- Se actualizó la validación en la ruta PUT (actualizar certificado)

## Dependent Files
- backend/server.js

## Followup Steps
1. Subir los cambios al VPS y reiniciar el servidor
2. Probar guardando un certificado con fecha de hoy

