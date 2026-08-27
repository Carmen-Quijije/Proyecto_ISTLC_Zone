// Servicio encargado de consultar y actualizar los datos de perfil.
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs';
import { PerfilRespuesta, Publicacion, Usuario } from '../core/modelos';

@Injectable({ providedIn: 'root' })
export class PerfilService {
  // URL relativa compartida con el backend publicado por Render.
  private readonly apiUrl = '/api/auth';

  constructor(private http: HttpClient) {}

  /** Recupera el perfil solicitado y envía el usuario actual como contexto. */
  obtener(usuarioId: number, usuarioActualId = usuarioId) {
    return this.http
      .get<any>(`${this.apiUrl}/profile/${usuarioId}?currentUserId=${usuarioActualId}`)
      .pipe(
        map((respuesta) => ({
          ...respuesta,
          usuario: this.normalizarUsuario(respuesta.usuario ?? respuesta.user ?? {}),
          seguidores: Number(respuesta.seguidores ?? respuesta.followers ?? 0),
          seguidos: Number(respuesta.seguidos ?? respuesta.following ?? 0),
          siguiendo: Boolean(respuesta.siguiendo),
          solicitudPendiente: Boolean(
            respuesta.solicitudPendiente ?? respuesta.solicitud_pendiente,
          ),
        }) as PerfilRespuesta),
      );
  }
  /** Envía al backend los campos editados del perfil. */
  actualizar(datos: unknown) {
    return this.http.put(`${this.apiUrl}/profile`, datos);
  }
  /** Solicita la eliminación definitiva después de la confirmación explícita del usuario. */
  eliminar(usuarioId: number) {
    return this.http.delete(`${this.apiUrl}/profile/${usuarioId}`, {
      body: { confirmacion: 'ELIMINAR' },
    });
  }

  /** Recupera las publicaciones creadas por un perfil. */
  obtenerPublicaciones(usuarioId: number, usuarioActualId: number) {
    return this.http
      .get<{ success: boolean; publicaciones: Publicacion[] }>(
        `${this.apiUrl}/posts/user/${usuarioId}?currentUserId=${usuarioActualId}`,
      )
      .pipe(map((respuesta: any) => respuesta.publicaciones ?? respuesta.posts ?? []));
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

  /** Recupera publicaciones con fotografías donde el perfil fue mencionado con @usuario. */
  obtenerPublicacionesEtiquetadas(usuarioId: number, usuarioActualId: number) {
    return this.http
      .get<{ success: boolean; publicaciones: Publicacion[] }>(
        `${this.apiUrl}/posts/tagged/${usuarioId}?currentUserId=${usuarioActualId}`,
      )
      .pipe(map((respuesta: any) => respuesta.publicaciones ?? respuesta.posts ?? []));
  }

  /** Admite tanto los campos normalizados de Angular como los nombres de la versión original. */
  private normalizarUsuario(usuario: any): Usuario {
    return {
      ...usuario,
      id: Number(usuario.id ?? usuario.usuarioId ?? usuario.usuario_id ?? 0),
      nombre: usuario.nombre ?? usuario.nombreCompleto ?? usuario.nombre_completo ?? usuario.usuario ?? 'Usuario ISTLC',
      email: usuario.email ?? '',
      usuario: usuario.usuario ?? usuario.username ?? '',
      privacidad: Boolean(usuario.privacidad),
      emailVerificado: Boolean(usuario.emailVerificado ?? usuario.email_verificado),
      viveEn: usuario.viveEn ?? usuario.vive_en ?? '',
      lugarOrigen: usuario.lugarOrigen ?? usuario.lugar_origen ?? '',
      fechaNacimiento: usuario.fechaNacimiento ?? usuario.fecha_nacimiento ?? '',
      estadoCivil: usuario.estadoCivil ?? usuario.estado_civil ?? '',
      tipoUsuario: usuario.tipoUsuario ?? usuario.tipo_usuario ?? '',
      carrera: usuario.carrera ?? '',
      semestre: usuario.semestre ?? '',
      fotoPerfil: usuario.fotoPerfil ?? usuario.foto_perfil ?? '',
      bio: usuario.bio ?? '',
      rol: usuario.rol ?? 'usuario',
    };
  }
}
