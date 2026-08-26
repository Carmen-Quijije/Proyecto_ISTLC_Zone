// Servicio de acceso a conversaciones y mensajes privados.
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MensajesService {
  // URL relativa compartida con el backend publicado por Render.
  private readonly apiUrl = '/api/auth';

  constructor(private http: HttpClient) {}

  /** Recupera el resumen de conversaciones del usuario autenticado. */
  listarConversaciones(usuarioId: number) {
    return this.http.get<any[]>(`${this.apiUrl}/messages/conversations/${usuarioId}`);
  }
  /** Obtiene el historial intercambiado entre el usuario y un contacto. */
  obtenerMensajes(usuarioId: number, contactoId: number) {
    return this.http.get<any[]>(`${this.apiUrl}/messages/${usuarioId}/${contactoId}`);
  }
  /** Crea un mensaje nuevo indicando emisor, receptor y contenido. */
  enviar(emisorId: number, receptorId: number, contenido: string) {
    return this.http.post<any>(`${this.apiUrl}/messages`, { emisorId, receptorId, contenido });
  }
}
