// Servicio que concentra las operaciones HTTP relacionadas con personas y seguimiento.
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AmigosService {
  private readonly apiUrl = 'http://localhost:3000/api/auth';

  constructor(private http: HttpClient) {}

  /** Busca usuarios y excluye o marca al usuario que realiza la consulta. */
  buscar(termino: string, usuarioId: number) {
    return this.http.get<any[]>(
      `${this.apiUrl}/users?q=${encodeURIComponent(termino)}&currentUserId=${usuarioId}`,
    );
  }
  /** Envía al backend la relación entre seguidor y usuario seguido. */
  seguir(seguidorId: number, seguidoId: number) {
    return this.http.post(`${this.apiUrl}/follow`, { seguidorId, seguidoId });
  }
}
