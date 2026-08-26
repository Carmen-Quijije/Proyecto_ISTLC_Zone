// Servicio encargado de consultar y actualizar los datos de perfil.
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly apiUrl = 'http://localhost:3000/api/auth';

  constructor(private http: HttpClient) {}

  /** Recupera el perfil solicitado y envía el usuario actual como contexto. */
  obtener(usuarioId: number) {
    return this.http.get<any>(`${this.apiUrl}/profile/${usuarioId}?currentUserId=${usuarioId}`);
  }
  /** Envía al backend los campos editados del perfil. */
  actualizar(datos: unknown) {
    return this.http.put(`${this.apiUrl}/profile`, datos);
  }
}
