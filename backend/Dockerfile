# Etapa 1: compila el frontend Angular ubicado en frontend-angular.
FROM node:22-alpine AS frontend-build

WORKDIR /app/frontend-angular

COPY frontend-angular/package*.json ./
RUN npm ci

COPY frontend-angular/ ./
RUN npm run build

# Etapa 2: instala y ejecuta el backend Express.
FROM node:22-alpine

WORKDIR /app

COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

COPY backend/ ./backend/
COPY --from=frontend-build /app/frontend-angular/dist/proyecto-istlc-zone-angular/browser ./frontend-angular/dist/proyecto-istlc-zone-angular/browser

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "backend/server.js"]
