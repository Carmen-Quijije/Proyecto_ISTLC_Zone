// Proveedores globales que estarán disponibles en toda la aplicación.
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { actualizarVistaInterceptor } from './core/actualizar-vista.interceptor';

// Configura el manejo de errores, las rutas y el cliente HTTP de Angular.
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([actualizarVistaInterceptor])),
  ],
};
