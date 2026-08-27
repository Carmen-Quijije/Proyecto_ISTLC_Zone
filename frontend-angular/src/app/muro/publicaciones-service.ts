// Servicio del muro: concentra publicaciones, imágenes, reacciones y comentarios.
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs';
import { Comentario, Publicacion } from '../core/modelos';

export type { Comentario, Publicacion } from '../core/modelos';

@Injectable({ providedIn: 'root' })
export class PublicacionesService {
  private readonly apiUrl = '/api/auth';

  constructor(private http: HttpClient) {}

  obtenerMuro(usuarioId: number) {
    return this.http
      .get<{ success: boolean; publicaciones: Publicacion[] }>(`${this.apiUrl}/feed/${usuarioId}`)
      .pipe(map((respuesta: any): Publicacion[] => respuesta.publicaciones ?? respuesta.posts ?? []));
  }

  crear(usuarioId: number, contenido: string, imagenesUrls: string[] = []) {
    return this.http.post<{ success: boolean; id: number }>(`${this.apiUrl}/posts`, {
      usuarioId,
      contenido,
      imagenesUrls,
    });
  }

  editar(publicacionId: number, usuarioId: number, contenido: string, imagenesUrls: string[]) {
    return this.http.put(`${this.apiUrl}/posts/${publicacionId}`, {
      usuarioId,
      contenido,
      imagenesUrls,
    });
  }

  eliminar(publicacionId: number, usuarioId: number) {
    return this.http.delete(`${this.apiUrl}/posts/${publicacionId}`, { body: { usuarioId } });
  }

  cambiarMeGusta(publicacionId: number, usuarioId: number, activo: boolean) {
    return activo
      ? this.http.delete(`${this.apiUrl}/posts/${publicacionId}/like`, { body: { usuarioId } })
      : this.http.post(`${this.apiUrl}/posts/${publicacionId}/like`, { usuarioId });
  }

  obtenerComentarios(publicacionId: number) {
    return this.http
      .get<{ success: boolean; comentarios: Comentario[] }>(
        `${this.apiUrl}/posts/${publicacionId}/comments`,
      )
      .pipe(map((respuesta: any): Comentario[] => respuesta.comentarios ?? []));
  }

  comentar(
    publicacionId: number,
    usuarioId: number,
    contenido: string,
    comentarioPadreId?: number,
  ) {
    return this.http.post(`${this.apiUrl}/posts/${publicacionId}/comments`, {
      usuarioId,
      contenido,
      comentarioPadreId,
    });
  }

  editarComentario(
    publicacionId: number,
    comentarioId: number,
    usuarioId: number,
    contenido: string,
  ) {
    return this.http.put(`${this.apiUrl}/posts/${publicacionId}/comments/${comentarioId}`, {
      usuarioId,
      contenido,
    });
  }

  eliminarComentario(publicacionId: number, comentarioId: number, usuarioId: number) {
    return this.http.delete(`${this.apiUrl}/posts/${publicacionId}/comments/${comentarioId}`, {
      body: { usuarioId },
    });
  }

  subirImagen(archivo: File, folder = 'istlc-zone/publicaciones') {
    const datos = new FormData();
    datos.append('image', archivo);
    datos.append('folder', folder);
    return this.http.post<{ success: boolean; url: string }>(`${this.apiUrl}/upload-image`, datos);
  }

  reportar(
    tipo: 'publicacion' | 'comentario' | 'perfil',
    referenciaId: number,
    reportanteId: number,
    motivo: string,
  ) {
    return this.http.post(`${this.apiUrl}/reports`, { tipo, referenciaId, reportanteId, motivo });
  }

  compartirEnPerfil(publicacionId: number, usuarioId: number) {
    return this.http.post(`${this.apiUrl}/posts/${publicacionId}/share-profile`, { usuarioId });
  }

  compartirPorMensaje(publicacionId: number, emisorId: number, receptorId: number) {
    return this.http.post(`${this.apiUrl}/posts/${publicacionId}/share-message`, {
      emisorId,
      receptorId,
    });
  }
}
