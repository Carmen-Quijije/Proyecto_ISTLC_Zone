// Secciones secundarias del perfil: información, fotos, cumpleaños y actividad.
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { catchError, forkJoin, of } from 'rxjs';
import { AmigosService } from '../../amigos/amigos-service';
import { AutenticacionService } from '../../autenticacion/autenticacion-service';
import { PerfilRespuesta, Publicacion, Usuario } from '../../core/modelos';
import { PublicacionesService } from '../../muro/publicaciones-service';
import { PerfilService } from '../perfil-service';

@Component({
  selector: 'app-secciones-perfil',
  imports: [RouterLink, MatCardModule, MatIconModule, MatButtonModule],
  templateUrl: './secciones-perfil.html',
  styleUrl: './secciones-perfil.css',
})
export class SeccionesPerfil implements OnInit {
  seccion = 'informacion';
  perfilId = 0;
  perfil?: Usuario;
  respuesta?: PerfilRespuesta;
  publicaciones: Publicacion[] = [];
  publicacionesEtiquetadas: Publicacion[] = [];
  amigos: Usuario[] = [];
  actividades: any[] = [];
  private solicitudCarga = 0;
  constructor(
    private route: ActivatedRoute,
    private perfilService: PerfilService,
    private amigosService: AmigosService,
    private auth: AutenticacionService,
    private publicacionesService: PublicacionesService,
    private detector: ChangeDetectorRef,
  ) {}
  ngOnInit(): void {
    this.route.data.subscribe((d) => {
      this.seccion = d['seccion'];
      this.route.queryParamMap.subscribe((p) => {
        const usuario: any = this.auth.usuario();
        const idSesion = Number(usuario?.id ?? usuario?.usuarioId ?? 0);
        const idParametro = Number(p.get('id'));
        this.perfilId = Number.isFinite(idParametro) && idParametro > 0 ? idParametro : idSesion;
        this.cargar();
        this.actualizarVista();
      });
    });
  }
  cargar(): void {
    const usuarioSesion: any = this.auth.usuario();
    const actual = Number(usuarioSesion?.id ?? usuarioSesion?.usuarioId ?? 0);
    if (!actual || !this.perfilId || !usuarioSesion) return;
    const perfilSolicitado = this.perfilId;
    const solicitud = ++this.solicitudCarga;

    // Muestra inmediatamente el perfil que ya se consultó en la pestaña Todo.
    const guardado = this.leerPerfilGuardado(perfilSolicitado);
    if (guardado) {
      this.perfil = guardado.usuario;
      this.respuesta = guardado;
      this.actualizarVista();
    }

    // Nombre, foto, bio y datos del perfil propio se muestran inmediatamente desde la sesión.
    if (this.esPropio) {
      this.perfil = usuarioSesion;
      this.respuesta = {
        success: true,
        usuario: usuarioSesion,
        seguidores: Number(usuarioSesion.seguidores ?? 0),
        seguidos: Number(usuarioSesion.seguidos ?? 0),
        siguiendo: false,
        solicitudPendiente: false,
      };
    }

    this.perfilService.obtener(this.perfilId, actual).subscribe({
      next: (r) => {
        if (solicitud !== this.solicitudCarga || perfilSolicitado !== this.perfilId) return;
        this.respuesta = {
          ...r,
          seguidores: Math.max(Number(r.seguidores || 0), Number(this.respuesta?.seguidores || 0)),
          seguidos: Math.max(Number(r.seguidos || 0), Number(this.respuesta?.seguidos || 0)),
        };
        this.perfil = r.usuario;
        this.guardarPerfil(this.respuesta);
        this.actualizarVista();
      },
      error: () => {
        if (solicitud !== this.solicitudCarga || perfilSolicitado !== this.perfilId) return;
        // En el perfil propio se conserva la información iniciada en sesión.
      },
    });
    if (this.seccion === 'fotos')
      forkJoin({
        subidas: this.perfilService
          .obtenerPublicaciones(this.perfilId, actual)
          .pipe(catchError(() => of([] as Publicacion[]))),
        etiquetadas: this.perfilService
          .obtenerPublicacionesEtiquetadas(this.perfilId, actual)
          .pipe(catchError(() => of([] as Publicacion[]))),
      }).subscribe(({ subidas, etiquetadas }) => {
        if (solicitud !== this.solicitudCarga || perfilSolicitado !== this.perfilId) return;
        this.publicaciones = subidas;
        this.publicacionesEtiquetadas = etiquetadas;
        this.actualizarVista();
      });
    // Cumpleaños siempre pertenece a la red del usuario autenticado, aun al visitar otro perfil.
    if (this.seccion === 'cumpleanos')
      this.amigosService
        .listarSiguiendo(actual, actual)
        .subscribe({
          next: (a) => {
          if (solicitud !== this.solicitudCarga || perfilSolicitado !== this.perfilId) return;
          // Orden ascendente: cumpleaños más cercano primero y el más lejano al final.
          this.amigos = a
            .filter((x) => !!x.fechaNacimiento)
            .sort((a, b) => this.dias(a.fechaNacimiento) - this.dias(b.fechaNacimiento));
          this.actualizarVista();
          },
          error: () => {
            if (solicitud !== this.solicitudCarga || perfilSolicitado !== this.perfilId) return;
            this.amigos = [];
            this.actualizarVista();
          },
        });
    if (this.seccion === 'actividad')
      this.perfilService.obtenerActividad(this.perfilId).subscribe((a) => {
        if (solicitud !== this.solicitudCarga || perfilSolicitado !== this.perfilId) return;
        this.actividades = a;
        this.actualizarVista();
      });
  }
  get fotos(): string[] {
    return [...new Set(this.publicaciones.flatMap((p) => this.fotosPublicacion(p)))];
  }
  get gruposFotos(): { clave: string; titulo: string; fotos: string[] }[] {
    return this.agruparFotos(this.publicaciones);
  }
  get gruposFotosEtiquetadas(): { clave: string; titulo: string; fotos: string[] }[] {
    return this.agruparFotos(this.publicacionesEtiquetadas);
  }
  private agruparFotos(publicaciones: Publicacion[]): { clave: string; titulo: string; fotos: string[] }[] {
    const grupos = new Map<string, string[]>();
    const agregadas = new Set<string>();
    for (const publicacion of publicaciones) {
      const fotos = this.fotosPublicacion(publicacion).filter((foto) => {
        if (agregadas.has(foto)) return false;
        agregadas.add(foto);
        return true;
      });
      if (!fotos.length) continue;
      const fecha = new Date(publicacion.fecha);
      const clave = Number.isNaN(fecha.getTime())
        ? 'sin-fecha'
        : `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
      grupos.set(clave, [...(grupos.get(clave) ?? []), ...fotos]);
    }
    return [...grupos.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([clave, fotos]) => ({
        clave,
        titulo:
          clave === 'sin-fecha'
            ? 'fecha no registrada'
            : new Date(`${clave}T12:00:00`).toLocaleDateString('es-EC', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              }),
        fotos,
      }));
  }
  get tituloCumpleanos(): string {
    return 'Próximos cumpleaños de tus amigos';
  }
  get esPropio(): boolean {
    const usuario: any = this.auth.usuario();
    return this.perfilId === Number(usuario?.id ?? usuario?.usuarioId ?? 0);
  }
  seguir(): void {
    const actual = this.auth.usuario()?.id;
    if (!actual) return;
    this.amigosService.seguir(actual, this.perfilId).subscribe(() => {
      if (this.respuesta) this.respuesta.solicitudPendiente = true;
    });
  }
  dejarDeSeguir(): void {
    const actual = this.auth.usuario()?.id;
    if (!actual) return;
    this.amigosService.dejarDeSeguir(actual, this.perfilId).subscribe(() => {
      if (this.respuesta) this.respuesta.siguiendo = false;
    });
  }
  reportar(): void {
    const actual = this.auth.usuario()?.id;
    const motivo = window.prompt('Motivo del reporte')?.trim();
    if (!actual || !motivo) return;
    this.publicacionesService.reportar('perfil', this.perfilId, actual, motivo).subscribe();
  }
  dias(fecha?: string): number {
    if (!fecha) return 366;
    const f = this.fechaLocal(fecha);
    if (!f) return 366;
    const ahora = new Date();
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    let proxima = new Date(hoy.getFullYear(), f.getMonth(), f.getDate());
    if (proxima < hoy) proxima = new Date(hoy.getFullYear() + 1, f.getMonth(), f.getDate());
    return Math.round((proxima.getTime() - hoy.getTime()) / 86400000);
  }
  fecha(valor?: string): string {
    const fecha = this.fechaLocal(valor);
    return fecha
      ? fecha.toLocaleDateString('es-EC', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : 'No registrado';
  }
  iconoActividad(tipo?: string): string {
    const iconos: Record<string, string> = {
      publicacion: 'article',
      compartir: 'share',
      comentario: 'chat_bubble',
      like: 'favorite',
      seguimiento: 'person_add',
      solicitud_aceptada: 'how_to_reg',
      registro: 'person',
    };
    return iconos[tipo ?? ''] ?? 'history';
  }
  rutaActividad(item: any): string {
    return String(item?.destino ?? '').includes('muro.html') ? '/muro' : '/perfil';
  }
  parametrosActividad(item: any): Record<string, number | string> {
    const destino = String(item?.destino ?? '');
    if (destino.includes('muro.html')) {
      const publicacion = Number(/(?:post|publicacion)=(\d+)/.exec(destino)?.[1] ?? 0);
      return {
        ...(publicacion ? { publicacion } : {}),
        ...(destino.includes('comentarios=1') ? { comentarios: 1 } : {}),
      };
    }
    const id = Number(/[?&]id=(\d+)/.exec(destino)?.[1] ?? this.perfilId);
    return { id };
  }
  private fotosPublicacion(publicacion: Publicacion): string[] {
    const fotos = Array.isArray(publicacion.imagenes) ? publicacion.imagenes.filter(Boolean) : [];
    if (publicacion.imagenUrl) fotos.push(publicacion.imagenUrl);
    return [...new Set(fotos)];
  }
  private fechaLocal(valor?: string): Date | undefined {
    const coincidencia = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor ?? '');
    if (!coincidencia) return undefined;
    const fecha = new Date(
      Number(coincidencia[1]),
      Number(coincidencia[2]) - 1,
      Number(coincidencia[3]),
    );
    return Number.isNaN(fecha.getTime()) ? undefined : fecha;
  }
  private leerPerfilGuardado(id: number): PerfilRespuesta | undefined {
    try {
      const respuesta = JSON.parse(
        localStorage.getItem(`istlc-zone-perfil-${id}`) ?? 'null',
      ) as PerfilRespuesta | null;
      return Number(respuesta?.usuario?.id) === Number(id) ? respuesta ?? undefined : undefined;
    } catch {
      localStorage.removeItem(`istlc-zone-perfil-${id}`);
      return undefined;
    }
  }
  private guardarPerfil(respuesta: PerfilRespuesta): void {
    try {
      localStorage.setItem(
        `istlc-zone-perfil-${Number(respuesta.usuario.id)}`,
        JSON.stringify(respuesta),
      );
    } catch {
      // Render continúa siendo la fuente oficial; esta copia solo acelera la vista.
    }
  }
  private actualizarVista(): void {
    queueMicrotask(() => {
      this.detector.markForCheck();
      this.detector.detectChanges();
    });
  }
}
