// Servicio que concentra las operaciones HTTP relacionadas con personas y seguimiento.
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs';
import { Usuario } from '../core/modelos';

@Injectable({ providedIn: 'root' })
export class AmigosService {
  // URL relativa compartida con el backend publicado por Render.
  private readonly apiUrl = '/api/auth';

  constructor(private http: HttpClient) {}

  /** Busca usuarios y excluye o marca al usuario que realiza la consulta. */
  buscar(termino: string, usuarioId: number) {
    return this.http
      .get<{ success: boolean; usuarios: Usuario[] }>(
        `${this.apiUrl}/users?q=${encodeURIComponent(termino)}&currentUserId=${usuarioId}`,
      )
      .pipe(map((respuesta) => respuesta.usuarios));
  }

  /** Lista las personas que forman parte de la red de un perfil. */
  listarSiguiendo(perfilId: number, usuarioActualId: number) {
    return this.http
      .get<{ success: boolean; usuarios: Usuario[] }>(
        `${this.apiUrl}/following/${perfilId}?currentUserId=${usuarioActualId}`,
      )
      .pipe(map((respuesta) => respuesta.usuarios));
  }
  /** Envía al backend la relación entre seguidor y usuario seguido. */
  seguir(seguidorId: number, seguidoId: number) {
    return this.http.post(`${this.apiUrl}/follow`, { seguidorId, seguidoId });
  }

  /** Elimina un seguimiento o una solicitud pendiente. */
  dejarDeSeguir(seguidorId: number, seguidoId: number) {
    return this.http.delete(`${this.apiUrl}/follow`, { body: { seguidorId, seguidoId } });
  }
}
