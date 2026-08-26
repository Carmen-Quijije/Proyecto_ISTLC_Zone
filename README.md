# Proyecto ISTLC Zone - Angular

Frontend reorganizado siguiendo la estructura del ejemplo `facturacionWeb`:

- Cada dominio tiene su propia carpeta.
- Cada componente separa TypeScript, HTML y CSS.
- Los servicios están ubicados en la carpeta del dominio correspondiente.
- `app.routes.ts` importa los componentes de forma explícita.
- La navegación interna usa `routerLink` y `routerLinkActive`.
- La interfaz utiliza componentes de Angular Material.

## Estructura principal

```text
src/app/
├── autenticacion/
├── muro/
├── perfil/
├── amigos/
├── mensajes/
├── empleos/
├── plataformas/
├── pagina-no-encontrada/
├── app.config.ts
├── app.css
├── app.html
├── app.routes.ts
└── app.ts
```

## Ejecución

```bash
npm install
npm start
```

Abre `http://localhost:4200`. El backend de ISTLC Zone debe estar activo en `http://localhost:3000`.
