// Servicio y modelo utilizados por el muro de publicaciones.
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

// Define los campos que la interfaz necesita para representar una publicación.
export interface Publicacion {
  id: number;
  nombre?: string;
  usuario?: string;
  foto_perfil?: string;
  contenido: string;
  imagen?: string;
  fecha_creacion?: string;
  likes?: number;
}

@Injectable({ providedIn: 'root' })
export class PublicacionesService {
  private readonly apiUrl = 'http://localhost:3000/api/auth';

  constructor(private http: HttpClient) {}

  /** Solicita el feed personalizado del usuario. */
  obtenerMuro(usuarioId: number) {
    return this.http.get<Publicacion[]>(`${this.apiUrl}/feed/${usuarioId}`);
  }
  /** Crea una publicación de texto y devuelve el registro generado. */
  crear(usuarioId: number, contenido: string) {
    return this.http.post<Publicacion>(`${this.apiUrl}/posts`, { usuarioId, contenido });
  }
  /** Registra una reacción de tipo Me gusta sobre una publicación. */
  indicarMeGusta(publicacionId: number, usuarioId: number) {
    return this.http.post(`${this.apiUrl}/posts/${publicacionId}/like`, { usuarioId });
  }
}
