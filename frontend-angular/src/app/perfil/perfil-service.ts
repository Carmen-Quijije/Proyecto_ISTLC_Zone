// Servicio encargado de consultar y actualizar los datos de perfil.
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs';
import { PerfilRespuesta, Publicacion } from '../core/modelos';

@Injectable({ providedIn: 'root' })
export class PerfilService {
  // URL relativa compartida con el backend publicado por Render.
  private readonly apiUrl = '/api/auth';

  constructor(private http: HttpClient) {}

  /** Recupera el perfil solicitado y envía el usuario actual como contexto. */
  obtener(usuarioId: number, usuarioActualId = usuarioId) {
    return this.http.get<PerfilRespuesta>(
      `${this.apiUrl}/profile/${usuarioId}?currentUserId=${usuarioActualId}`,
    );
  }
  /** Envía al backend los campos editados del perfil. */
  actualizar(datos: unknown) {
    return this.http.put(`${this.apiUrl}/profile`, datos);
  }

  /** Recupera las publicaciones creadas por un perfil. */
  obtenerPublicaciones(usuarioId: number, usuarioActualId: number) {
    return this.http
      .get<{ success: boolean; publicaciones: Publicacion[] }>(
        `${this.apiUrl}/posts/user/${usuarioId}?currentUserId=${usuarioActualId}`,
      )
      .pipe(map((respuesta) => respuesta.publicaciones));
  }

  /** Sube una fotografía a Cloudinary mediante el backend. */
  subirImagen(archivo: File, folder: string) {
    const datos = new FormData();
    datos.append('image', archivo);
    datos.append('folder', folder);
    return this.http.post<{ success: boolean; url: string }>(`${this.apiUrl}/upload-image`, datos);
  }

  /** Obtiene el historial de actividad de un perfil. */
  obtenerActividad(usuarioId: number) {
    return this.http
      .get<{ success: boolean; actividades: any[] }>(`${this.apiUrl}/activity/${usuarioId}`)
      .pipe(map((respuesta) => respuesta.actividades));
  }
}
