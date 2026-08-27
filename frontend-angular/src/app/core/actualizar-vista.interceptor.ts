// Garantiza que las respuestas HTTP actualicen las plantillas en Angular sin Zone.js.
import { HttpInterceptorFn } from '@angular/common/http';
import { ApplicationRef, inject } from '@angular/core';
import { finalize } from 'rxjs';

export const actualizarVistaInterceptor: HttpInterceptorFn = (solicitud, siguiente) => {
  const aplicacion = inject(ApplicationRef);

  return siguiente(solicitud).pipe(
    finalize(() => {
      // Las peticiones terminan fuera de los eventos de la plantilla. Programar el ciclo
      // en una microtarea evita que el usuario tenga que hacer clic para ver la respuesta.
      queueMicrotask(() => {
        if (!aplicacion.destroyed) aplicacion.tick();
      });
    }),
  );
};
