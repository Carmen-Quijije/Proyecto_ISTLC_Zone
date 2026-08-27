// Muro social equivalente a la versión original: perfil, publicaciones, comentarios y sugerencias.
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { concatMap, finalize, from, of, switchMap, timeout, toArray } from 'rxjs';
import { AmigosService } from '../../amigos/amigos-service';
import { AutenticacionService } from '../../autenticacion/autenticacion-service';
import { Comentario, Publicacion, Usuario } from '../../core/modelos';
import { PerfilService } from '../../perfil/perfil-service';
import { PublicacionesService } from '../publicaciones-service';

@Component({
  selector: 'app-listar-publicaciones',
  imports: [
    FormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './listar-publicaciones.html',
  styleUrl: './listar-publicaciones.css',
})
export class ListarPublicaciones implements OnInit, OnDestroy {
  publicaciones: Publicacion[] = [];
  perfil?: Usuario;
  seguidores = 0;
  seguidos = 0;
  sugerencias: Usuario[] = [];
  contenido = '';
  archivos: File[] = [];
  previews: string[] = [];
  comentarios: Record<number, Comentario[]> = {};
  comentariosVisibles = new Set<number>();
  textosComentario: Record<number, string> = {};
  respuestasComentario: Record<number, Comentario | undefined> = {};
  likesProcesando = new Set<number>();
  comentariosProcesando = new Set<number>();
  compartirPublicacionId?: number;
  contactosCompartir: Usuario[] = [];
  imagenesVisor: string[] = [];
  indiceVisor = 0;
  publicacionMeGustaModal?: Publicacion;
  usuariosMeGusta: Usuario[] = [];
  cargandoUsuariosMeGusta = false;
  publicacionComentariosModal?: Publicacion;
  comentariosModal: Comentario[] = [];
  cargandoComentariosModal = false;
  publicando = false;
  estadoPublicacion = 'Publicando...';
  mensaje = '';
  private cargaActual = 0;
  private temporizadorActualizacion?: ReturnType<typeof setInterval>;

  constructor(
    private publicacionesService: PublicacionesService,
    private perfilService: PerfilService,
    private amigosService: AmigosService,
    public autenticacionService: AutenticacionService,
    private route: ActivatedRoute,
    private detector: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // Se ejecuta al entrar y también cuando cambia un parámetro del muro.
    this.route.queryParamMap.subscribe(() => this.cargarTodo());
    this.temporizadorActualizacion = setInterval(() => this.refrescarPublicaciones(), 10000);
  }

  ngOnDestroy(): void {
    if (this.temporizadorActualizacion) clearInterval(this.temporizadorActualizacion);
  }

  /** Actualiza contadores y contenido sin recargar el resto del muro ni cerrar comentarios. */
  private refrescarPublicaciones(): void {
    if (document.hidden || this.publicando) return;
    const usuario: any = this.autenticacionService.usuario();
    const id = Number(usuario?.id ?? usuario?.usuarioId ?? 0);
    if (!id) return;
    this.publicacionesService.obtenerMuro(id).subscribe({
      next: (datos) => {
        this.publicaciones = datos;
        this.guardarMuro(id, datos);
        [...this.comentariosVisibles].forEach((publicacionId) =>
          this.cargarComentarios(publicacionId),
        );
        this.actualizarVista();
      },
      error: () => {},
    });
  }

  cargarTodo(): void {
    const usuarioSesion: any = this.autenticacionService.usuario();
    const id = Number(usuarioSesion?.id ?? usuarioSesion?.usuarioId ?? 0);
    if (!id) {
      this.mensaje = 'No se pudo identificar la sesión para cargar el muro.';
      return;
    }
    const carga = ++this.cargaActual;
    this.mensaje = '';
    // Muestra inmediatamente los datos guardados al iniciar sesión mientras Render responde.
    this.perfil = usuarioSesion;
    this.restaurarMuro(id);
    this.actualizarVista();
    this.publicacionesService
      .obtenerMuro(id)
      .subscribe({
        next: (datos) => {
          if (carga !== this.cargaActual) return;
          this.publicaciones = datos;
          this.guardarMuro(id, datos);
          this.enfocarPublicacionDesdeUrl();
          this.actualizarVista();
        },
        error: () => {
          if (carga === this.cargaActual) this.mensaje = 'No se pudo cargar el muro. Intenta nuevamente.';
          this.actualizarVista();
        },
      });
    this.perfilService.obtener(id, id).subscribe({
      next: (respuesta) => {
        if (carga !== this.cargaActual) return;
        this.perfil = respuesta.usuario;
        this.seguidores = respuesta.seguidores;
        this.seguidos = respuesta.seguidos;
        this.actualizarVista();
      },
      error: () => {
        if (!this.mensaje)
          this.mensaje = 'No se pudieron actualizar el perfil y los contadores.';
      },
    });
    this.amigosService
      .obtenerSugerencias(id)
      .subscribe((usuarios) => {
        if (carga === this.cargaActual) this.sugerencias = usuarios;
        this.actualizarVista();
      });
    this.amigosService
      .listarSiguiendo(id, id)
      .subscribe((usuarios) => {
        if (carga !== this.cargaActual) return;
        this.contactosCompartir = usuarios;
        this.seguidos = Math.max(this.seguidos, usuarios.length);
        this.actualizarVista();
      });
  }

  seleccionarImagenes(evento: Event): void {
    const seleccionados = Array.from((evento.target as HTMLInputElement).files ?? []);
    const demasiadoGrandes = seleccionados.filter((archivo) => archivo.size > 8 * 1024 * 1024);
    this.archivos = seleccionados
      .filter((archivo) => archivo.size <= 8 * 1024 * 1024)
      .slice(0, 6);
    this.mensaje = demasiadoGrandes.length
      ? 'Cada fotografía debe pesar máximo 8 MB.'
      : seleccionados.length > 6
        ? 'Puedes subir hasta 6 fotos por publicación.'
        : '';
    this.previews.forEach((url) => URL.revokeObjectURL(url));
    this.previews = this.archivos.map((archivo) => URL.createObjectURL(archivo));
  }

  publicar(): void {
    const usuario: any = this.autenticacionService.usuario();
    const id = Number(usuario?.id ?? usuario?.usuarioId ?? 0);
    if (!id || this.publicando || (!this.contenido.trim() && !this.archivos.length)) return;
    this.publicando = true;
    this.mensaje = '';
    const contenido = this.contenido.trim();
    const archivos = [...this.archivos];
    this.estadoPublicacion = archivos.length ? 'Subiendo imágenes...' : 'Publicando...';

    const imagenes$ = archivos.length
      ? from(archivos).pipe(
          // La versión anterior subía una por una para no saturar Cloudinary.
          concatMap((archivo) =>
            this.publicacionesService.subirImagen(archivo).pipe(timeout(90000)),
          ),
          toArray(),
        )
      : of([]);

    imagenes$
      .pipe(
        switchMap((respuestas) => {
          this.estadoPublicacion = 'Publicando...';
          return this.publicacionesService
            .crear(id, contenido, respuestas.map((respuesta) => respuesta.url))
            .pipe(timeout(90000));
        }),
        // Siempre habilita nuevamente el botón, tanto en éxito como en error o espera agotada.
        finalize(() => {
          this.publicando = false;
          this.estadoPublicacion = 'Publicando...';
        }),
      )
      .subscribe({
        next: () => {
          this.previews.forEach((url) => URL.revokeObjectURL(url));
          this.contenido = '';
          this.archivos = [];
          this.previews = [];
          this.mensaje = 'Publicación creada correctamente.';
          this.cargarTodo();
        },
        error: (error) => {
          this.mensaje =
            error?.name === 'TimeoutError'
              ? 'La publicación tardó demasiado. Intenta nuevamente en unos segundos.'
              : error.error?.message || 'No se pudo completar la publicación.';
        },
      });
  }

  get mencionesPublicacion(): Usuario[] {
    return this.filtrarMenciones(this.contenido);
  }

  mencionesComentario(publicacionId: number): Usuario[] {
    return this.filtrarMenciones(this.textosComentario[publicacionId] ?? '');
  }

  agregarMencionPublicacion(persona: Usuario): void {
    this.contenido = this.insertarMencion(this.contenido, persona.usuario);
  }

  agregarMencionComentario(publicacionId: number, persona: Usuario): void {
    this.textosComentario[publicacionId] = this.insertarMencion(
      this.textosComentario[publicacionId] ?? '',
      persona.usuario,
    );
  }

  private filtrarMenciones(texto: string): Usuario[] {
    const coincidencia = /(?:^|\s)@([^\s@]*)$/.exec(texto);
    if (!coincidencia) return [];
    const termino = coincidencia[1].toLowerCase();
    return this.contactosCompartir
      .filter(
        (persona) =>
          (persona.usuario ?? '').toLowerCase().includes(termino) ||
          (persona.nombre ?? '').toLowerCase().includes(termino),
      )
      .slice(0, 5);
  }

  private insertarMencion(texto: string, usuario: string): string {
    return `${texto.replace(/(?:^|\s)@[^\s@]*$/, (valor) =>
      valor.startsWith(' ') ? ` @${usuario}` : `@${usuario}`,
    )} `;
  }

  cambiarMeGusta(publicacion: Publicacion): void {
    const id = this.autenticacionService.usuario()?.id;
    if (!id || this.likesProcesando.has(publicacion.id)) return;
    const estadoAnterior = publicacion.likedByMe;
    const totalAnterior = publicacion.totalLikes;
    // Refleja el clic inmediatamente; si el servidor falla, se restaura el estado anterior.
    publicacion.likedByMe = !estadoAnterior;
    publicacion.totalLikes = Math.max(0, totalAnterior + (estadoAnterior ? -1 : 1));
    this.likesProcesando.add(publicacion.id);
    this.publicacionesService
      .cambiarMeGusta(publicacion.id, id, estadoAnterior)
      .pipe(finalize(() => this.likesProcesando.delete(publicacion.id)))
      .subscribe({
        next: () => (this.mensaje = ''),
        error: (error) => {
          publicacion.likedByMe = estadoAnterior;
          publicacion.totalLikes = totalAnterior;
          this.mensaje = error.error?.message || 'No se pudo actualizar el Me gusta.';
        },
      });
  }

  abrirUsuariosMeGusta(publicacion: Publicacion): void {
    if (!publicacion.totalLikes) return;
    this.publicacionMeGustaModal = publicacion;
    this.usuariosMeGusta = [];
    this.cargandoUsuariosMeGusta = true;
    this.publicacionesService
      .obtenerUsuariosMeGusta(publicacion.id)
      .pipe(finalize(() => (this.cargandoUsuariosMeGusta = false)))
      .subscribe({
        next: (usuarios) => (this.usuariosMeGusta = usuarios),
        error: () => (this.mensaje = 'No se pudo consultar quién reaccionó a la publicación.'),
      });
  }

  cerrarUsuariosMeGusta(): void {
    this.publicacionMeGustaModal = undefined;
    this.usuariosMeGusta = [];
  }

  mostrarComentarios(publicacion: Publicacion): void {
    if (this.comentariosVisibles.has(publicacion.id)) {
      this.comentariosVisibles.delete(publicacion.id);
      return;
    }
    this.comentariosVisibles.add(publicacion.id);
    this.cargarComentarios(publicacion.id);
  }

  cargarComentarios(publicacionId: number): void {
    this.publicacionesService
      .obtenerComentarios(publicacionId)
      .subscribe((datos) => {
        this.comentarios[publicacionId] = datos;
        if (this.publicacionComentariosModal?.id === publicacionId)
          this.comentariosModal = datos;
        const publicacion = this.publicaciones.find((item) => item.id === publicacionId);
        if (publicacion) publicacion.totalComentarios = datos.length;
      });
  }

  abrirComentariosModal(publicacion: Publicacion): void {
    this.publicacionComentariosModal = publicacion;
    this.comentariosModal = this.comentarios[publicacion.id] ?? [];
    this.cargandoComentariosModal = true;
    this.publicacionesService
      .obtenerComentarios(publicacion.id)
      .pipe(finalize(() => (this.cargandoComentariosModal = false)))
      .subscribe({
        next: (datos) => {
          this.comentarios[publicacion.id] = datos;
          this.comentariosModal = datos;
          publicacion.totalComentarios = datos.length;
        },
        error: () => (this.mensaje = 'No se pudieron cargar todos los comentarios.'),
      });
  }

  cerrarComentariosModal(): void {
    this.publicacionComentariosModal = undefined;
    this.comentariosModal = [];
  }

  comentar(publicacion: Publicacion): void {
    const id = this.autenticacionService.usuario()?.id;
    const texto = this.textosComentario[publicacion.id]?.trim();
    if (!id || !texto || this.comentariosProcesando.has(publicacion.id)) return;
    this.comentariosProcesando.add(publicacion.id);
    const padre = this.respuestasComentario[publicacion.id]?.id;
    this.publicacionesService
      .comentar(publicacion.id, id, texto, padre)
      .pipe(finalize(() => this.comentariosProcesando.delete(publicacion.id)))
      .subscribe({
      next: () => {
        this.textosComentario[publicacion.id] = '';
        this.respuestasComentario[publicacion.id] = undefined;
        publicacion.totalComentarios++;
        this.mensaje = '';
        this.cargarComentarios(publicacion.id);
      },
      error: (error) => {
        this.mensaje = error.error?.message || 'No se pudo publicar el comentario.';
      },
      });
  }

  prepararRespuesta(publicacionId: number, comentario: Comentario): void {
    this.respuestasComentario[publicacionId] = comentario;
  }

  cancelarRespuesta(publicacionId: number): void {
    this.respuestasComentario[publicacionId] = undefined;
  }

  esComentarioPropio(comentario: Comentario): boolean {
    return comentario.autor.id === this.autenticacionService.usuario()?.id;
  }

  editarComentario(publicacion: Publicacion, comentario: Comentario): void {
    const id = this.autenticacionService.usuario()?.id;
    const contenido = window.prompt('Editar comentario', comentario.contenido)?.trim();
    if (!id || !contenido) return;
    this.publicacionesService
      .editarComentario(publicacion.id, comentario.id, id, contenido)
      .subscribe(() => this.cargarComentarios(publicacion.id));
  }

  eliminarComentario(publicacion: Publicacion, comentario: Comentario): void {
    const id = this.autenticacionService.usuario()?.id;
    if (!id || !window.confirm('¿Quieres eliminar este comentario?')) return;
    this.publicacionesService
      .eliminarComentario(publicacion.id, comentario.id, id)
      .subscribe(() => {
        this.cargarComentarios(publicacion.id);
      });
  }

  reportarComentario(comentario: Comentario): void {
    const id = this.autenticacionService.usuario()?.id;
    const motivo = window.prompt('Cuéntanos el motivo del reporte')?.trim();
    if (!id || !motivo) return;
    this.publicacionesService
      .reportar('comentario', comentario.id, id, motivo)
      .subscribe(() => (this.mensaje = 'Reporte enviado a moderación.'));
  }

  editarPublicacion(publicacion: Publicacion): void {
    const id = this.autenticacionService.usuario()?.id;
    const contenido = window.prompt('Editar publicación', publicacion.contenido)?.trim();
    if (!id || contenido === undefined || contenido === null) return;
    this.publicacionesService
      .editar(publicacion.id, id, contenido, publicacion.imagenes)
      .subscribe(() => (publicacion.contenido = contenido));
  }

  eliminarPublicacion(publicacion: Publicacion): void {
    const id = this.autenticacionService.usuario()?.id;
    if (!id || !window.confirm('¿Eliminar esta publicación?')) return;
    this.publicacionesService
      .eliminar(publicacion.id, id)
      .subscribe(
        () =>
          (this.publicaciones = this.publicaciones.filter((item) => item.id !== publicacion.id)),
      );
  }

  reportar(publicacion: Publicacion): void {
    const id = this.autenticacionService.usuario()?.id;
    const motivo = window.prompt('Indica el motivo del reporte')?.trim();
    if (!id || !motivo) return;
    this.publicacionesService
      .reportar('publicacion', publicacion.id, id, motivo)
      .subscribe(() => (this.mensaje = 'Reporte enviado a moderación.'));
  }

  abrirCompartir(publicacion: Publicacion): void {
    this.compartirPublicacionId =
      this.compartirPublicacionId === publicacion.id ? undefined : publicacion.id;
  }

  compartirEnPerfil(publicacion: Publicacion): void {
    const id = this.autenticacionService.usuario()?.id;
    if (!id) return;
    this.publicacionesService
      .compartirEnPerfil(publicacion.id, id)
      .subscribe(() => {
        this.mensaje = 'Publicación compartida en tu perfil.';
        this.compartirPublicacionId = undefined;
      });
  }

  compartirPorMensaje(publicacion: Publicacion, contacto: Usuario): void {
    const id = this.autenticacionService.usuario()?.id;
    if (!id) return;
    this.publicacionesService
      .compartirPorMensaje(publicacion.id, id, contacto.id)
      .subscribe(() => {
        this.mensaje = `Publicación enviada a ${contacto.nombre}.`;
        this.compartirPublicacionId = undefined;
      });
  }

  abrirVisor(imagenes: string[], indice: number): void {
    this.imagenesVisor = imagenes;
    this.indiceVisor = indice;
  }

  cerrarVisor(): void {
    this.imagenesVisor = [];
  }

  moverVisor(direccion: number): void {
    this.indiceVisor =
      (this.indiceVisor + direccion + this.imagenesVisor.length) % this.imagenesVisor.length;
  }

  private enfocarPublicacionDesdeUrl(): void {
    const id = Number(this.route.snapshot.queryParamMap.get('publicacion') || 0);
    if (!id) return;
    const publicacion = this.publicaciones.find((item) => item.id === id);
    if (publicacion && this.route.snapshot.queryParamMap.get('comentarios'))
      this.mostrarComentarios(publicacion);
    setTimeout(() => document.getElementById(`publicacion-${id}`)?.scrollIntoView({ behavior: 'smooth' }));
  }

  seguir(persona: Usuario): void {
    const id = this.autenticacionService.usuario()?.id;
    if (!id) return;
    this.amigosService.seguir(id, persona.id).subscribe({
      next: () => {
        persona.solicitudPendiente = true;
        this.mensaje = `Solicitud enviada a ${persona.nombre}.`;
      },
      error: (error) => {
        this.mensaje = error.error?.message || 'No se pudo enviar la solicitud de amistad.';
      },
    });
  }

  /** Abre el mismo panel global de la campana sin duplicar llamadas al servidor. */
  abrirNotificaciones(): void {
    document.getElementById('btn-notificaciones-app')?.click();
  }

  esPropia(publicacion: Publicacion): boolean {
    return publicacion.autor.id === this.autenticacionService.usuario()?.id;
  }

  /** Divide el texto sin usar HTML dinámico para resaltar menciones de forma segura. */
  segmentarMenciones(texto = ''): { texto: string; mencion: boolean }[] {
    return texto
      .split(/(@[a-zA-Z0-9._-]+)/g)
      .filter(Boolean)
      .map((parte) => ({ texto: parte, mencion: /^@/.test(parte) }));
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' });
  }

  private restaurarMuro(usuarioId: number): void {
    try {
      const guardadas = JSON.parse(
        localStorage.getItem(`istlc-zone-muro-${usuarioId}`) ?? '[]',
      ) as Publicacion[];
      if (Array.isArray(guardadas)) this.publicaciones = guardadas;
    } catch {
      localStorage.removeItem(`istlc-zone-muro-${usuarioId}`);
    }
  }

  private guardarMuro(usuarioId: number, publicaciones: Publicacion[]): void {
    try {
      localStorage.setItem(`istlc-zone-muro-${usuarioId}`, JSON.stringify(publicaciones));
    } catch {
      // Render sigue siendo la fuente oficial; esta copia evita un muro vacío al regresar.
    }
  }

  private actualizarVista(): void {
    queueMicrotask(() => {
      this.detector.markForCheck();
      this.detector.detectChanges();
    });
  }
}
