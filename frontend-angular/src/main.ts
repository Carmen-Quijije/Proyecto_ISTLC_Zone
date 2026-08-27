// Punto de entrada de la aplicación: inicia el componente raíz con su configuración global.
import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig).catch(console.error);
