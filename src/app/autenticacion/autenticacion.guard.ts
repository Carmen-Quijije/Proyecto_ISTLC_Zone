// Guard funcional que impide entrar a rutas privadas sin una sesión válida.
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AutenticacionService } from './autenticacion-service';

export const autenticacionGuard: CanActivateFn = () => {
  // inject permite obtener servicios dentro de una función de guard.
  const autenticacionService = inject(AutenticacionService);
  const router = inject(Router);

  // Autoriza la ruta o construye una redirección hacia el inicio de sesión.
  return autenticacionService.estaAutenticado() || router.createUrlTree(['/iniciarSesion']);
};
