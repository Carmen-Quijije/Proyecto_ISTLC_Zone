# Proyecto ISTLC Zone

Aplicación organizada como un proyecto de pila completa para mantener la configuración existente de Render.

## Estructura

- `frontend-angular/`: interfaz desarrollada con Angular y Angular Material.
- `backend/`: API REST desarrollada con Node.js, Express y PostgreSQL.

En Render, Angular consume `/api/auth` desde el mismo dominio del backend. En desarrollo, el proxy de Angular redirige `/api` a `http://localhost:3000`.

## Desarrollo local

Primero inicia el backend:

```bash
cd backend
npm install
npm start
```

Después inicia Angular en otra terminal:

```bash
cd frontend-angular
npm install
npm start
```

Abre `http://localhost:4200`.

## Despliegue existente de Render

El archivo usado por el servicio continúa en `backend/Dockerfile`. El contexto de construcción debe seguir siendo la raíz del repositorio, igual que en la versión anterior. El Dockerfile compila Angular y luego inicia Express, que publica tanto `/api/auth` como las rutas de la aplicación.
