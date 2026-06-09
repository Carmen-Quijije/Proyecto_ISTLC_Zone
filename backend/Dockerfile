FROM node:18-alpine

WORKDIR /app

# Copiar el package.json del backend
COPY backend/package*.json ./

# Instalar dependencias
RUN npm install

# Copiar todo el proyecto
COPY . .

EXPOSE 3000

# Ejecutar el servidor
CMD ["node", "backend/server.js"]
