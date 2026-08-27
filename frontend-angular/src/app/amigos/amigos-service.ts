// Servicio que concentra las operaciones HTTP relacionadas con personas y seguimiento.
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
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

  /** Prioriza amigos de amigos y completa la lista con las cuentas más recientes. */
  obtenerSugerencias(usuarioId: number, limite = 4) {
    return forkJoin({
      candidatos: this.buscar('', usuarioId),
      amigos: this.listarSiguiendo(usuarioId, usuarioId),
    }).pipe(
      switchMap(({ candidatos, amigos }) => {
        const consultas = amigos.slice(0, 12).map((amigo) =>
          this.listarSiguiendo(amigo.id, usuarioId).pipe(catchError(() => of([] as Usuario[]))),
        );
        const redes$ = consultas.length ? forkJoin(consultas) : of([] as Usuario[][]);
        return redes$.pipe(
          map((redes) => {
            const conexionesComunes = new Map<number, number>();
            redes.flat().forEach((persona) =>
              conexionesComunes.set(
                persona.id,
                (conexionesComunes.get(persona.id) ?? 0) + 1,
              ),
            );
            return candidatos
              .filter((persona) => !persona.siguiendo)
              .sort(
                (a, b) =>
                  (conexionesComunes.get(b.id) ?? 0) - (conexionesComunes.get(a.id) ?? 0) ||
                  Number(a.solicitudPendiente) - Number(b.solicitudPendiente) ||
                  b.id - a.id,
              )
              .slice(0, limite)
              .map((persona) => {
                const comunes = conexionesComunes.get(persona.id) ?? 0;
                return {
                  ...persona,
                  motivoSugerencia: comunes
                    ? `${comunes} conexión${comunes === 1 ? '' : 'es'} en común`
                    : 'Usuario nuevo o sugerido',
                };
              });
          }),
        );
      }),
    );
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
