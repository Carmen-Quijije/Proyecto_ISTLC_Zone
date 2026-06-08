# ISTLC Zone - Plataforma de Registro y Autenticación

Sistema de registro e autenticación para estudiantes del Tecnológico Liceo Cristiano con validación de dominio institucional.

## 🚀 Características

- ✅ Formulario de registro centrado y responsivo
- ✅ Validación de dominio (@tecnologicoliceocristiano.edu.ec)
- ✅ Modal de confirmación de email
- ✅ Código de verificación de 6 dígitos
- ✅ Encriptación de contraseñas con bcryptjs
- ✅ Backend Node.js + Express
- ✅ Base de datos SQLite
- ✅ Docker para fácil deployment
- ✅ Google Sign-In integrado

## 📋 Requisitos

- Docker y Docker Compose instalados
- Node.js 18+ (opcional, Docker maneja esto)
- npm (si ejecutas sin Docker)

## 🔧 Setup Rápido

### 1. Clonar el repositorio
```bash
git clone <URL-del-repo>
cd Proyecto_ISTLC_Zone
```

### 2. Configurar variables de entorno
```bash
# Crear archivo .env en la carpeta backend
cp backend/.env.example backend/.env

# Editar backend/.env y agregar:
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=tu-contraseña-app-gmail
```

### 3. Ejecutar con Docker
```bash
docker-compose up -d
```

El servidor estará disponible en: **http://localhost:3000**

### 4. Sin Docker (desarrollo local)
```bash
cd backend
npm install
npm run dev
```

## 📁 Estructura del Proyecto

```
.
├── index.html              # Página de login
├── Registro.html           # Página de registro
├── style.css               # Estilos
├── docker-compose.yml      # Configuración Docker
└── backend/
    ├── server.js           # Servidor Express
    ├── database.js         # Configuración SQLite
    ├── package.json        # Dependencias Node
    ├── Dockerfile          # Configuración Docker
    ├── .env.example        # Variables de entorno
    ├── routes/
    │   └── auth.js         # Rutas de autenticación
    └── data/
        └── app.db          # Base de datos (auto-creada)
```

## 🔐 Endpoints de API

### POST `/api/auth/register`
Registrar nuevo usuario
```json
{
  "nombre": "Juan Pérez",
  "email": "juan@tecnologicoliceocristiano.edu.ec",
  "usuario": "juanperez123",
  "password": "Password123!",
  "privacidad": true
}
```

### POST `/api/auth/verify-email`
Verificar código de email
```json
{
  "email": "juan@tecnologicoliceocristiano.edu.ec",
  "codigo": "123456"
}
```

### POST `/api/auth/resend-code`
Reenviar código de verificación
```json
{
  "email": "juan@tecnologicoliceocristiano.edu.ec"
}
```

## 📧 Configurar Gmail para enviar correos

1. Ve a https://myaccount.google.com/security
2. Habilita "Acceso de apps menos seguras"
3. Genera una contraseña de app: https://myaccount.google.com/apppasswords
4. Usa esa contraseña en `backend/.env` como `EMAIL_PASS`

## 🧪 Testing

### Con código demo (en desarrollo)
La respuesta de `/api/auth/register` incluye `codigoDemo` para testing sin email.

### Ejemplo de flujo:
```bash
# 1. Registrar usuario
POST http://localhost:3000/api/auth/register
# Respuesta: {"success": true, "codigoDemo": "123456"}

# 2. Verificar con el código demo
POST http://localhost:3000/api/auth/verify-email
Body: {"email": "usuario@...", "codigo": "123456"}
# Respuesta: {"success": true}
```

## 👥 Trabajo en grupo

Para que ambos miembros puedan trabajar sin problemas:

1. **Cada uno clona el repo**
2. **Ambos ejecutan:**
   ```bash
   docker-compose up -d
   ```
3. **Editan archivos en paralelo** (Git maneja los conflictos)
4. **Hacen commits y push** regularmente
5. **Resuelven conflictos** si existen

## 🐛 Troubleshooting

### Puerto 3000 en uso
```bash
# Cambiar puerto en docker-compose.yml
ports:
  - "8080:3000"  # Usar 8080 en lugar de 3000
```

### Errores de permisos en Linux/Mac
```bash
chmod +x backend/Dockerfile
```

### Base de datos corrupta
```bash
rm backend/data/app.db
docker-compose restart
```

## 📝 Notas de desarrollo

- Frontend: HTML5 + Bootstrap 5 + Vanilla JavaScript
- Backend: Node.js + Express
- BD: SQLite3
- Seguridad: bcryptjs para hashing, JWT para tokens

## 📄 Licencia

Proyecto educativo - Tecnológico Liceo Cristiano 2026
