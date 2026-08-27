// Servicio del centro de notificaciones y solicitudes de seguimiento.
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { forkJoin, map } from 'rxjs';
import { Notificacion, SolicitudSeguimiento } from '../core/modelos';

@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private readonly apiUrl = '/api/auth';

  constructor(private http: HttpClient) {}

  cargar(usuarioId: number) {
    return forkJoin({
      notificaciones: this.http.get<{
        success: boolean;
        notificaciones: Notificacion[];
        sinLeer: number;
      }>(`${this.apiUrl}/notifications/${usuarioId}`),
      solicitudes: this.http.get<{ success: boolean; solicitudes: SolicitudSeguimiento[] }>(
        `${this.apiUrl}/follow-requests/${usuarioId}`,
      ),
    }).pipe(
      map(({ notificaciones, solicitudes }) => ({
        notificaciones: notificaciones.notificaciones,
        solicitudes: solicitudes.solicitudes,
        sinLeer: notificaciones.sinLeer + solicitudes.solicitudes.length,
      })),
    );
  }

  responder(solicitudId: number, accion: 'aceptar' | 'rechazar') {
    return this.http.put(`${this.apiUrl}/follow-requests/${solicitudId}/${accion}`, {});
  }

  marcarTodas(usuarioId: number) {
    return this.http.put(`${this.apiUrl}/notifications/read`, { usuarioId });
  }
}
