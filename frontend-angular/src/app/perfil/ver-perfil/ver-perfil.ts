// Perfil completo con datos, red y publicaciones, compatible con perfiles propios y ajenos.
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin } from 'rxjs';
import { AmigosService } from '../../amigos/amigos-service';
import { AutenticacionService } from '../../autenticacion/autenticacion-service';
import { PerfilRespuesta, Publicacion, Usuario } from '../../core/modelos';
import { PublicacionesService } from '../../muro/publicaciones-service';
import { PerfilService } from '../perfil-service';

@Component({
  selector: 'app-ver-perfil',
  imports: [RouterLink, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './ver-perfil.html',
  styleUrl: './ver-perfil.css',
})
export class VerPerfil implements OnInit {
  perfilId = 0;
  perfil?: Usuario;
  respuesta?: PerfilRespuesta;
  publicaciones: Publicacion[] = [];
  amigos: Usuario[] = [];
  cargando = true;
  mensaje = '';
  private solicitudPerfil = 0;
  constructor(
    private route: ActivatedRoute,
    private perfilService: PerfilService,
    private amigosService: AmigosService,
    private publicacionesService: PublicacionesService,
    public autenticacionService: AutenticacionService,
    private detector: ChangeDetectorRef,
  ) {}
  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const usuarioSesion: any = this.autenticacionService.usuario();
      const idSesion = Number(usuarioSesion?.id ?? usuarioSesion?.usuarioId ?? 0);
      const idParametro = Number(params.get('id'));
      this.cargar(Number.isFinite(idParametro) && idParametro > 0 ? idParametro : idSesion);
    });
  }
  cargar(id: number): void {
    const usuarioSesion: any = this.autenticacionService.usuario();
    const actual = Number(usuarioSesion?.id ?? usuarioSesion?.usuarioId ?? 0);
    if (!id || !actual || !usuarioSesion) {
      this.perfil = undefined;
      this.cargando = false;
      this.actualizarVista();
      this.mensaje = 'No se pudo identificar el perfil. Regresa al muro e inténtalo nuevamente.';
      return;
    }
    const solicitud = ++this.solicitudPerfil;
    this.perfilId = id;
    this.mensaje = '';
    this.publicaciones = [];
    this.amigos = [];

    // El perfil propio se muestra de inmediato con la información guardada al iniciar sesión.
    if (id === actual) {
      const perfilGuardado = this.leerPerfilGuardado(id);
      this.perfil = perfilGuardado?.usuario ?? usuarioSesion;
      this.respuesta = perfilGuardado ?? {
        success: true,
        usuario: usuarioSesion,
        seguidores: Number(usuarioSesion.seguidores ?? 0),
        seguidos: Number(usuarioSesion.seguidos ?? 0),
        siguiendo: false,
        solicitudPendiente: false,
      };
      this.cargando = false;
    } else {
      const perfilGuardado = this.leerPerfilGuardado(id);
      const vistaPrevia = this.leerVistaPrevia(id);
      this.perfil = perfilGuardado?.usuario ?? vistaPrevia;
      this.respuesta = perfilGuardado ?? (vistaPrevia
        ? {
            success: true,
            usuario: vistaPrevia,
            seguidores: 0,
            seguidos: 0,
            siguiendo: Boolean(vistaPrevia.siguiendo),
            solicitudPendiente: Boolean(vistaPrevia.solicitudPendiente),
          }
        : undefined);
      this.cargando = !this.perfil;
    }
    this.actualizarVista();

    this.perfilService.obtener(id, actual).subscribe({
      next: (r) => {
        if (solicitud !== this.solicitudPerfil || id !== this.perfilId) return;
        if (!r?.usuario?.id) {
          this.cargarPerfilDeRespaldo(id, actual, solicitud);
          return;
        }
        this.respuesta = {
          ...r,
          // La lista de relaciones ya cargada evita que una respuesta antigua vuelva a mostrar cero.
          seguidores: Math.max(Number(r.seguidores || 0), Number(this.respuesta?.seguidores || 0)),
          seguidos: Math.max(Number(r.seguidos || 0), this.amigos.length, Number(this.respuesta?.seguidos || 0)),
        };
        this.perfil = r.usuario;
        this.guardarPerfil(this.respuesta);
        this.cargando = false;
        this.actualizarVista();
      },
      error: () => {
        if (solicitud !== this.solicitudPerfil || id !== this.perfilId) return;
        this.cargarPerfilDeRespaldo(id, actual, solicitud);
      },
    });
    this.perfilService.obtenerPublicaciones(id, actual).subscribe({
      next: (publicaciones) => {
        if (solicitud !== this.solicitudPerfil || id !== this.perfilId) return;
        this.publicaciones = publicaciones;
        this.actualizarVista();
        if (!publicaciones.length) this.cargarPublicacionesDesdeMuro(actual, id, solicitud);
      },
      error: () => {
        if (solicitud === this.solicitudPerfil && id === this.perfilId)
          this.cargarPublicacionesDesdeMuro(actual, id, solicitud);
      },
    });
    this.amigosService.listarSiguiendo(id, actual).subscribe({
      next: (amigos) => {
        if (solicitud === this.solicitudPerfil && id === this.perfilId) {
          this.amigos = amigos;
          if (this.respuesta)
            this.respuesta.seguidos = Math.max(
              Number(this.respuesta.seguidos || 0),
              amigos.length,
            );
          this.actualizarVista();
        }
      },
      error: () => {
        if (solicitud === this.solicitudPerfil && id === this.perfilId) this.amigos = [];
      },
    });
  }
  private leerVistaPrevia(id: number): Usuario | undefined {
    try {
      const clave = `istlc-zone-perfil-vista-${id}`;
      const persona = JSON.parse(
        localStorage.getItem(clave) ?? localStorage.getItem('perfilVistaPrevia') ?? 'null',
      ) as Usuario | null;
      localStorage.removeItem(clave);
      localStorage.removeItem('perfilVistaPrevia');
      return Number(persona?.id) === Number(id) ? persona ?? undefined : undefined;
    } catch {
      localStorage.removeItem(`istlc-zone-perfil-vista-${id}`);
      localStorage.removeItem('perfilVistaPrevia');
      return undefined;
    }
  }
  /** Usa la lista compatible con la versión anterior si el endpoint individual no responde. */
  private cargarPerfilDeRespaldo(id: number, actual: number, solicitud: number): void {
    this.amigosService.buscar('', actual).subscribe({
      next: (usuarios) => {
        if (solicitud !== this.solicitudPerfil || id !== this.perfilId) return;
        const encontrado = usuarios.find((usuario) => Number(usuario.id) === Number(id));
        if (encontrado) {
          this.perfil = encontrado;
          this.respuesta = {
            success: true,
            usuario: encontrado,
            seguidores: Number(this.respuesta?.seguidores || 0),
            seguidos: Math.max(this.amigos.length, Number(this.respuesta?.seguidos || 0)),
            siguiendo: Boolean(encontrado.siguiendo),
            solicitudPendiente: Boolean(encontrado.solicitudPendiente),
          };
          this.guardarPerfil(this.respuesta);
          this.mensaje = '';
        } else {
          this.mensaje = 'No se encontró el perfil solicitado.';
        }
        this.cargando = false;
        this.actualizarVista();
      },
      error: () => {
        if (solicitud !== this.solicitudPerfil || id !== this.perfilId) return;
        this.mensaje = 'No se pudo cargar el perfil solicitado.';
        this.cargando = false;
        this.actualizarVista();
      },
    });
  }
  /** Conserva el último perfil completo por ID para mostrarlo al primer clic mientras Render actualiza. */
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
      // La caché solo evita pantallas vacías; Render continúa siendo la fuente oficial.
    }
  }
  /** Respaldo compatible con el muro original para no ocultar publicaciones ya existentes. */
  private cargarPublicacionesDesdeMuro(actual: number, perfilId: number, solicitud: number): void {
    this.publicacionesService.obtenerMuro(actual).subscribe({
      next: (publicaciones) => {
        if (solicitud !== this.solicitudPerfil || perfilId !== this.perfilId) return;
        this.publicaciones = publicaciones.filter(
          (publicacion) => Number(publicacion.autor.id) === Number(perfilId),
        );
        this.actualizarVista();
      },
      error: () => {
        if (solicitud === this.solicitudPerfil && perfilId === this.perfilId)
          this.publicaciones = [];
      },
    });
  }
  get esPropio(): boolean {
    const usuario: any = this.autenticacionService.usuario();
    return this.perfilId === Number(usuario?.id ?? usuario?.usuarioId ?? 0);
  }
  esAutor(publicacion: Publicacion): boolean {
    return Number(publicacion.autor.id) === Number(this.autenticacionService.usuario()?.id || 0);
  }
  estaEtiquetadoEn(publicacion: Publicacion): boolean {
    return Number(publicacion.autor.id) !== Number(this.perfilId);
  }
  segmentarMenciones(texto = ''): { texto: string; mencion: boolean }[] {
    return texto
      .split(/(@[a-zA-Z0-9._-]+)/g)
      .filter(Boolean)
      .map((parte) => ({ texto: parte, mencion: /^@/.test(parte) }));
  }
  seguir(): void {
    const actual = this.autenticacionService.usuario()?.id;
    if (!actual || !this.perfil) return;
    this.amigosService.seguir(actual, this.perfil.id).subscribe(() => {
      if (this.respuesta) this.respuesta.solicitudPendiente = true;
    });
  }
  dejarDeSeguir(): void {
    const actual = this.autenticacionService.usuario()?.id;
    if (!actual || !this.perfil) return;
    this.amigosService.dejarDeSeguir(actual, this.perfil.id).subscribe(() => {
      if (this.respuesta) this.respuesta.siguiendo = false;
    });
  }
  reportar(): void {
    const actual = this.autenticacionService.usuario()?.id;
    const motivo = window.prompt('Motivo del reporte')?.trim();
    if (!actual || !this.perfil || !motivo) return;
    this.publicacionesService
      .reportar('perfil', this.perfil.id, actual, motivo)
      .subscribe(() => (this.mensaje = 'Reporte enviado a moderación.'));
  }
  editarPublicacion(publicacion: Publicacion): void {
    const usuarioId = this.autenticacionService.usuario()?.id;
    const contenido = window.prompt('Editar publicación', publicacion.contenido)?.trim();
    if (!usuarioId || contenido === undefined || contenido === null) return;
    this.publicacionesService
      .editar(publicacion.id, usuarioId, contenido, publicacion.imagenes)
      .subscribe(() => (publicacion.contenido = contenido));
  }
  agregarImagenes(publicacion: Publicacion): void {
    const usuarioId = this.autenticacionService.usuario()?.id;
    if (!usuarioId || publicacion.imagenes.length >= 6) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = () => {
      const archivos = Array.from(input.files ?? []).slice(0, 6 - publicacion.imagenes.length);
      if (!archivos.length) return;
      forkJoin(archivos.map((archivo) => this.publicacionesService.subirImagen(archivo))).subscribe(
        (respuestas) => {
          const imagenes = [...publicacion.imagenes, ...respuestas.map((r) => r.url)];
          this.publicacionesService
            .editar(publicacion.id, usuarioId, publicacion.contenido, imagenes)
            .subscribe(() => (publicacion.imagenes = imagenes));
        },
      );
    };
    input.click();
  }
  quitarImagen(publicacion: Publicacion, indice: number): void {
    const usuarioId = this.autenticacionService.usuario()?.id;
    if (!usuarioId) return;
    const imagenes = publicacion.imagenes.filter((_, i) => i !== indice);
    this.publicacionesService
      .editar(publicacion.id, usuarioId, publicacion.contenido, imagenes)
      .subscribe(() => (publicacion.imagenes = imagenes));
  }
  eliminarPublicacion(publicacion: Publicacion): void {
    const usuarioId = this.autenticacionService.usuario()?.id;
    if (!usuarioId || !window.confirm('¿Eliminar esta publicación?')) return;
    this.publicacionesService
      .eliminar(publicacion.id, usuarioId)
      .subscribe(() => (this.publicaciones = this.publicaciones.filter((p) => p.id !== publicacion.id)));
  }
  formatear(fecha: string): string {
    return new Date(fecha).toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' });
  }
  private actualizarVista(): void {
    queueMicrotask(() => {
      this.detector.markForCheck();
      this.detector.detectChanges();
    });
  }
}
