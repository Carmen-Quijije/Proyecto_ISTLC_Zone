// Servicio de conversaciones privadas compatible con las respuestas del backend original.
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs';
import { Mensaje, Usuario } from '../core/modelos';

@Injectable({ providedIn: 'root' })
export class MensajesService {
  private readonly apiUrl = '/api/auth';

  constructor(private http: HttpClient) {}

  listarConversaciones(usuarioId: number) {
    return this.http
      .get<{ success: boolean; conversaciones: Usuario[] }>(
        `${this.apiUrl}/messages/conversations/${usuarioId}`,
      )
      .pipe(map((respuesta) => respuesta.conversaciones ?? []));
  }

  obtenerMensajes(usuarioId: number, contactoId: number) {
    return this.http.get<{ success: boolean; contacto: Usuario; mensajes: Mensaje[] }>(
      `${this.apiUrl}/messages/${usuarioId}/${contactoId}`,
    );
  }

  enviar(emisorId: number, receptorId: number, contenido: string) {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/messages`, {
      emisorId,
      receptorId,
      contenido,
    });
  }

  /** Marca como leídas las notificaciones relacionadas con el chat abierto. */
  marcarConversacionLeida(usuarioId: number, contactoId: number) {
    return this.http.put(`${this.apiUrl}/notifications/read-target`, {
      usuarioId,
      tipo: 'mensaje',
      referenciaId: contactoId,
    });
  }

  compartirPublicacion(publicacionId: number, emisorId: number, receptorId: number) {
    return this.http.post(`${this.apiUrl}/posts/${publicacionId}/share-message`, {
      emisorId,
      receptorId,
    });
  }
}
