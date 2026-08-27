// Componente raíz con navegación, usuario y centro de notificaciones global.
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
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
  constructor(
    public autenticacionService: AutenticacionService,
    private notificacionesService: NotificacionesService,
    private amigosService: AmigosService,
    private router: Router,
  ) {}
  ngOnInit(): void {
    this.aplicarTemaGuardado();
    this.cargarNotificaciones();
    this.temporizador = setInterval(() => this.cargarNotificaciones(), 15000);
  }
  ngOnDestroy(): void {
    if (this.temporizador) clearInterval(this.temporizador);
    if (this.temporizadorBusqueda) clearTimeout(this.temporizadorBusqueda);
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
      this.resultadosGlobales = [];
      return;
    }
    this.buscandoUsuarios = true;
    this.temporizadorBusqueda = setTimeout(() => {
      const id = this.autenticacionService.usuario()?.id;
      if (!id) return;
      this.amigosService.buscar(termino, id).subscribe({
        next: (usuarios) => {
          this.resultadosGlobales = usuarios.slice(0, 5);
          this.buscandoUsuarios = false;
        },
        error: () => {
          this.resultadosGlobales = [];
          this.buscandoUsuarios = false;
        },
      });
    }, 250);
  }
  cerrarBusqueda(): void {
    this.busquedaGlobal = '';
    this.resultadosGlobales = [];
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
    const referencia = notificacion.referenciaId ?? notificacion.referencia_id;
    if (notificacion.tipo === 'mensaje')
      this.router.navigate(['/mensajes'], { queryParams: { contacto: referencia } });
    else if (['solicitud_aceptada', 'seguimiento'].includes(notificacion.tipo) && referencia)
      this.router.navigate(['/perfil'], { queryParams: { id: referencia } });
    else if (referencia)
      this.router.navigate(['/muro'], {
        queryParams: {
          publicacion: referencia,
          comentarios: ['comentario', 'respuesta_comentario'].includes(notificacion.tipo) ? 1 : null,
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
}
