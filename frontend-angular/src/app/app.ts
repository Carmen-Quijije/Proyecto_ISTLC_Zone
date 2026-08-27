// Componente raíz con navegación, usuario y centro de notificaciones global.
import { ApplicationRef, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AutenticacionService } from './autenticacion/autenticacion-service';
import { AmigosService } from './amigos/amigos-service';
import { Notificacion, SolicitudSeguimiento, Usuario } from './core/modelos';
import { NotificacionesService } from './notificaciones/notificaciones-service';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatBadgeModule,
    FormsModule,
    MatInputModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit, OnDestroy {
  // Temas heredados de la aplicación Bootstrap original.
  readonly temas = [
    { id: 'tradicional', nombre: 'Tradicional', icono: 'light_mode' },
    { id: 'neon', nombre: 'Negro neón', icono: 'dark_mode' },
    { id: 'oceano', nombre: 'Azul océano', icono: 'water_drop' },
  ] as const;
  temaActual: 'tradicional' | 'neon' | 'oceano' = 'tradicional';
  notificaciones: Notificacion[] = [];
  solicitudes: SolicitudSeguimiento[] = [];
  sinLeer = 0;
  busquedaGlobal = '';
  resultadosGlobales: Usuario[] = [];
  buscandoUsuarios = false;
  private temporizador?: ReturnType<typeof setInterval>;
  private temporizadorBusqueda?: ReturnType<typeof setTimeout>;
  private secuenciaBusqueda = 0;
  private navegacion?: Subscription;
  constructor(
    public autenticacionService: AutenticacionService,
    private notificacionesService: NotificacionesService,
    private amigosService: AmigosService,
    private router: Router,
    private aplicacion: ApplicationRef,
    private detector: ChangeDetectorRef,
  ) {}
  ngOnInit(): void {
    this.aplicarTemaGuardado();
    this.cargarNotificaciones();
    this.temporizador = setInterval(() => this.cargarNotificaciones(), 15000);
    // Refresca todo el árbol también al usar Atrás/Adelante o cambiar solo parámetros.
    this.navegacion = this.router.events
      .pipe(filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd))
      .subscribe(() => {
        this.cerrarBusqueda();
        queueMicrotask(() => {
          this.detector.markForCheck();
          this.aplicacion.tick();
        });
      });
  }
  ngOnDestroy(): void {
    if (this.temporizador) clearInterval(this.temporizador);
    if (this.temporizadorBusqueda) clearTimeout(this.temporizadorBusqueda);
    this.navegacion?.unsubscribe();
  }
  /** Recupera la apariencia elegida anteriormente por el usuario. */
  private aplicarTemaGuardado(): void {
    const guardado = localStorage.getItem('temaIstlcModo');
    const permitido = this.temas.some((tema) => tema.id === guardado);
    this.seleccionarTema(
      permitido ? (guardado as 'tradicional' | 'neon' | 'oceano') : 'tradicional',
    );
  }
  /** Cambia las variables globales del tema y conserva la selección. */
  seleccionarTema(tema: 'tradicional' | 'neon' | 'oceano'): void {
    this.temaActual = tema;
    localStorage.setItem('temaIstlcModo', tema);
    document.documentElement.dataset['temaIstlc'] = tema;
    document.body.dataset['temaIstlc'] = tema;
  }
  /** Busca perfiles desde cualquier pantalla, como el buscador global original. */
  buscarUsuariosGlobal(): void {
    if (this.temporizadorBusqueda) clearTimeout(this.temporizadorBusqueda);
    const termino = this.busquedaGlobal.trim();
    if (!termino) {
      this.secuenciaBusqueda++;
      this.resultadosGlobales = [];
      this.buscandoUsuarios = false;
      return;
    }
    const consulta = termino.toLocaleLowerCase('es-EC');
    const secuencia = ++this.secuenciaBusqueda;
    this.buscandoUsuarios = true;
    this.temporizadorBusqueda = setTimeout(() => {
      const id = this.autenticacionService.usuario()?.id;
      if (!id) {
        this.buscandoUsuarios = false;
        return;
      }
      this.amigosService.buscar(termino, id).subscribe({
        next: (usuarios) => {
          if (secuencia !== this.secuenciaBusqueda) return;
          // Primero aparecen nombres o usuarios que comienzan exactamente con lo escrito.
          this.resultadosGlobales = usuarios
            .filter(
              (usuario) =>
                (usuario.nombre ?? '').toLocaleLowerCase('es-EC').startsWith(consulta) ||
                (usuario.usuario ?? '').toLocaleLowerCase('es-EC').startsWith(consulta),
            )
            .sort((a, b) =>
              (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es', { sensitivity: 'base' }),
            )
            .slice(0, 8);
          this.buscandoUsuarios = false;
          this.actualizarVista();
        },
        error: () => {
          if (secuencia !== this.secuenciaBusqueda) return;
          this.resultadosGlobales = [];
          this.buscandoUsuarios = false;
          this.actualizarVista();
        },
      });
    }, 100);
  }
  cerrarBusqueda(): void {
    if (this.temporizadorBusqueda) clearTimeout(this.temporizadorBusqueda);
    this.secuenciaBusqueda++;
    this.busquedaGlobal = '';
    this.resultadosGlobales = [];
    this.buscandoUsuarios = false;
  }
  /** Conserva una vista previa para mostrar el perfil elegido mientras responde Render. */
  prepararPerfil(persona: Usuario): void {
    localStorage.setItem('perfilVistaPrevia', JSON.stringify(persona));
    localStorage.setItem(`istlc-zone-perfil-vista-${Number(persona.id)}`, JSON.stringify(persona));
    // La búsqueda se cierra después de NavigationEnd para no destruir el enlace antes de navegar.
  }
  get mensajesSinLeer(): number {
    return this.notificaciones.filter(
      (notificacion) => notificacion.tipo === 'mensaje' && !notificacion.leida,
    ).length;
  }
  cargarNotificaciones(): void {
    const id = this.autenticacionService.usuario()?.id;
    if (!id) return;
    this.notificacionesService.cargar(id).subscribe({
      next: (r) => {
        this.notificaciones = r.notificaciones;
        this.solicitudes = r.solicitudes;
        this.sinLeer = r.sinLeer;
      },
    });
  }
  responder(solicitud: SolicitudSeguimiento, accion: 'aceptar' | 'rechazar'): void {
    this.notificacionesService
      .responder(solicitud.id, accion)
      .subscribe(() => this.cargarNotificaciones());
  }
  abrirNotificacion(notificacion: Notificacion): void {
    const usuarioId = this.autenticacionService.usuario()?.id;
    if (usuarioId && !notificacion.leida) {
      this.notificacionesService.marcarUna(notificacion.id, usuarioId).subscribe({
        next: () => {
          notificacion.leida = true;
          this.sinLeer = Math.max(0, this.sinLeer - 1);
        },
      });
    }
    const referencia = notificacion.referenciaId ?? notificacion.referencia_id;
    if (notificacion.tipo === 'mensaje')
      this.router.navigate(['/mensajes'], { queryParams: { contacto: referencia } });
    else if (['solicitud_aceptada', 'seguimiento'].includes(notificacion.tipo) && referencia)
      this.router.navigate(['/perfil'], { queryParams: { id: referencia } });
    else if (referencia)
      this.router.navigate(['/muro'], {
        queryParams: {
          publicacion: referencia,
          comentarios: ['comentario', 'respuesta_comentario', 'mencion'].includes(notificacion.tipo) ? 1 : null,
        },
      });
    else this.router.navigate(['/muro']);
  }
  marcarLeidas(): void {
    const id = this.autenticacionService.usuario()?.id;
    if (id)
      this.notificacionesService.marcarTodas(id).subscribe(() => {
        this.sinLeer = this.solicitudes.length;
        this.notificaciones = this.notificaciones.map((n) => ({ ...n, leida: true }));
      });
  }

  formatearFechaNotificacion(fecha: string): string {
    return fecha
      ? new Date(fecha).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })
      : '';
  }

  private actualizarVista(): void {
    queueMicrotask(() => {
      this.detector.markForCheck();
      this.detector.detectChanges();
    });
  }
}
