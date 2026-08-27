// Mensajería privada compatible con las conversaciones guardadas por el backend original.
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { catchError, forkJoin, of } from 'rxjs';
import { AmigosService } from '../../amigos/amigos-service';
import { AutenticacionService } from '../../autenticacion/autenticacion-service';
import { Mensaje, Usuario } from '../../core/modelos';
import { MensajesService } from '../mensajes-service';

@Component({
  selector: 'app-listar-mensajes',
  imports: [
    FormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './listar-mensajes.html',
  styleUrl: './listar-mensajes.css',
})
export class ListarMensajes implements OnInit, OnDestroy {
  contactos: Usuario[] = [];
  contactosFiltrados: Usuario[] = [];
  mensajes: Mensaje[] = [];
  contacto?: Usuario;
  texto = '';
  busqueda = '';
  cargandoContactos = true;
  mensajeError = '';

  private temporizador?: ReturnType<typeof setInterval>;
  private actualizandoContactos = false;
  private secuenciaBusqueda = 0;
  private contactoEnCarga = 0;
  private secuenciaChat = 0;

  constructor(
    private mensajesService: MensajesService,
    private amigosService: AmigosService,
    public autenticacionService: AutenticacionService,
    private route: ActivatedRoute,
    private detector: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // Presenta la última lista conocida de inmediato y luego la sincroniza con Render.
    this.restaurarContactosGuardados();
    // También vuelve a evaluar el contacto cuando cambia ?contacto= en la misma pantalla.
    this.route.queryParamMap.subscribe((parametros) => {
      // Abre primero el destinatario de ?contacto=; no espera a que termine la lista lateral.
      const contactoId = Number(parametros.get('contacto') || 0);
      this.abrirContactoSolicitado(contactoId);
      this.cargarContactos(false);
      this.actualizarVista();
    });
    this.temporizador = setInterval(() => this.refrescar(), 5000);
  }

  ngOnDestroy(): void {
    if (this.temporizador) clearInterval(this.temporizador);
  }

  /** Une conversaciones existentes y amigos sin hacer que una consulta dependa de la otra. */
  cargarContactos(silencioso = false): void {
    const id = Number(this.autenticacionService.usuario()?.id || 0);
    if (!id || this.actualizandoContactos) return;

    this.actualizandoContactos = true;
    if (!silencioso) this.cargandoContactos = true;
    let errorConversaciones = false;
    let errorAmigos = false;

    forkJoin({
      conversaciones: this.mensajesService.listarConversaciones(id).pipe(
        catchError(() => {
          errorConversaciones = true;
          return of([] as Usuario[]);
        }),
      ),
      amigos: this.amigosService.listarSiguiendo(id, id).pipe(
        catchError(() => {
          errorAmigos = true;
          return of([] as Usuario[]);
        }),
      ),
    }).subscribe({
      next: ({ conversaciones, amigos }) => {
        const mapa = new Map<number, Usuario>();

        // La conversación se agrega después para conservar último mensaje, fecha y no leídos.
        [...amigos, ...conversaciones].forEach((persona) => {
          const personaId = Number(persona.id);
          mapa.set(personaId, {
            ...mapa.get(personaId),
            ...persona,
            id: personaId,
          } as Usuario);
        });

        this.contactos = [...mapa.values()].sort((a, b) => {
          const diferenciaNoLeidos =
            Number(b.mensajesNoLeidos ?? 0) - Number(a.mensajesNoLeidos ?? 0);
          if (diferenciaNoLeidos) return diferenciaNoLeidos;
          if (a.ultimaFecha && b.ultimaFecha)
            return new Date(b.ultimaFecha).getTime() - new Date(a.ultimaFecha).getTime();
          if (a.ultimaFecha) return -1;
          if (b.ultimaFecha) return 1;
          return (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es');
        });
        this.guardarContactos();

        this.filtrar();
        this.abrirContactoSolicitado();
        this.mensajeError =
          errorConversaciones && errorAmigos
            ? 'No se pudieron cargar las conversaciones ni los amigos. Intenta nuevamente.'
            : errorConversaciones
              ? 'No se pudieron actualizar las conversaciones guardadas.'
              : errorAmigos
                ? 'Las conversaciones se cargaron, pero no se pudo actualizar la lista de amigos.'
                : '';
        this.cargandoContactos = false;
        this.actualizandoContactos = false;
        this.actualizarVista();
      },
      error: () => {
        this.mensajeError = 'No se pudieron cargar los mensajes.';
        this.cargandoContactos = false;
        this.actualizandoContactos = false;
        this.actualizarVista();
      },
    });
  }

  /** Busca entre las conversaciones y también entre todos los usuarios del sistema. */
  filtrar(): void {
    const consulta = this.busqueda.toLowerCase().trim();
    if (!consulta) {
      this.secuenciaBusqueda++;
      this.contactosFiltrados = [...this.contactos];
      this.actualizarVista();
      return;
    }

    const coincidenciasLocales = this.contactos.filter(
      (persona) =>
        (persona.nombre ?? '').toLowerCase().includes(consulta) ||
        (persona.usuario ?? '').toLowerCase().includes(consulta),
    );
    this.contactosFiltrados = coincidenciasLocales;

    const id = Number(this.autenticacionService.usuario()?.id || 0);
    const secuencia = ++this.secuenciaBusqueda;
    if (!id) return;

    this.amigosService.buscar(consulta, id).subscribe({
      next: (personas) => {
        if (secuencia !== this.secuenciaBusqueda) return;
        const mapa = new Map<number, Usuario>();
        [...coincidenciasLocales, ...personas]
          .filter((persona) => Number(persona.id) !== id)
          .forEach((persona) => {
            const existente = this.contactos.find(
              (contacto) => Number(contacto.id) === Number(persona.id),
            );
            mapa.set(Number(persona.id), {
              ...persona,
              ...existente,
              id: Number(persona.id),
            });
          });
        this.contactosFiltrados = [...mapa.values()];
        this.actualizarVista();
      },
    });
  }

  abrir(contacto: Usuario): void {
    this.contacto = contacto;
    this.mensajes = [];
    this.actualizarVista();
    this.obtenerChat();
  }

  obtenerChat(): void {
    const id = Number(this.autenticacionService.usuario()?.id || 0);
    if (!id || !this.contacto) return;
    const contactoId = Number(this.contacto.id);
    const secuencia = ++this.secuenciaChat;

    this.mensajesService.obtenerMensajes(id, contactoId).subscribe({
      next: (respuesta) => {
        if (secuencia !== this.secuenciaChat) return;
        this.contacto = respuesta.contacto;
        this.mensajes = respuesta.mensajes ?? [];
        this.mensajeError = '';
        this.mensajesService
          .marcarConversacionLeida(id, contactoId)
          .subscribe({ error: () => {} });
        this.actualizarVista();
      },
      error: (error) => {
        if (secuencia !== this.secuenciaChat) return;
        this.mensajeError = error.error?.message || 'No se pudo abrir la conversación.';
        this.actualizarVista();
      },
    });
  }

  enviar(): void {
    const id = Number(this.autenticacionService.usuario()?.id || 0);
    const contenido = this.texto.trim();
    if (!id || !this.contacto || !contenido) return;

    this.mensajesService.enviar(id, Number(this.contacto.id), contenido).subscribe({
      next: () => {
        this.texto = '';
        this.obtenerChat();
        this.cargarContactos(true);
        this.actualizarVista();
      },
      error: (error) => {
        this.mensajeError = error.error?.message || 'No se pudo enviar el mensaje.';
        this.actualizarVista();
      },
    });
  }

  private abrirContactoSolicitado(
    contactoId = Number(this.route.snapshot.queryParamMap.get('contacto') || 0),
  ): void {
    if (
      !contactoId ||
      Number(this.contacto?.id) === contactoId ||
      this.contactoEnCarga === contactoId
    )
      return;
    const seleccionado = this.contactos.find((persona) => Number(persona.id) === contactoId);
    if (seleccionado) this.abrir(seleccionado);
    else this.abrirPorId(contactoId);
  }

  /** Abre un chat desde Perfil o Notificaciones aunque aún no figure como amigo. */
  private abrirPorId(contactoId: number): void {
    const id = Number(this.autenticacionService.usuario()?.id || 0);
    if (!id) return;
    this.contactoEnCarga = contactoId;
    const secuencia = ++this.secuenciaChat;

    this.mensajesService.obtenerMensajes(id, contactoId).subscribe({
      next: (respuesta) => {
        if (this.contactoEnCarga === contactoId) this.contactoEnCarga = 0;
        if (secuencia !== this.secuenciaChat) return;
        this.contacto = respuesta.contacto;
        this.mensajes = respuesta.mensajes ?? [];
        if (!this.contactos.some((persona) => Number(persona.id) === contactoId)) {
          this.contactos = [respuesta.contacto, ...this.contactos];
          this.filtrar();
        }
        this.mensajesService
          .marcarConversacionLeida(id, contactoId)
          .subscribe({ error: () => {} });
        this.actualizarVista();
      },
      error: (error) => {
        if (this.contactoEnCarga === contactoId) this.contactoEnCarga = 0;
        if (secuencia !== this.secuenciaChat) return;
        this.mensajeError = error.error?.message || 'No se pudo abrir la conversación.';
        this.actualizarVista();
      },
    });
  }

  private refrescar(): void {
    if (document.hidden) return;
    this.cargarContactos(true);
    if (this.contacto) this.obtenerChat();
  }

  private claveContactos(): string {
    return `istlc-zone-conversaciones-${Number(this.autenticacionService.usuario()?.id || 0)}`;
  }

  private restaurarContactosGuardados(): void {
    try {
      const guardados = JSON.parse(localStorage.getItem(this.claveContactos()) || '[]');
      if (!Array.isArray(guardados) || !guardados.length) return;
      this.contactos = guardados;
      this.contactosFiltrados = [...guardados];
      this.cargandoContactos = false;
      this.abrirContactoSolicitado();
      this.actualizarVista();
    } catch {
      localStorage.removeItem(this.claveContactos());
    }
  }

  private guardarContactos(): void {
    try {
      localStorage.setItem(this.claveContactos(), JSON.stringify(this.contactos.slice(0, 100)));
    } catch {
      // El almacenamiento local es solo una mejora visual; la fuente oficial sigue siendo Render.
    }
  }

  hora(fecha?: string): string {
    return fecha
      ? new Date(fecha).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })
      : '';
  }

  /** Refleja respuestas asíncronas inmediatamente, sin requerir otro clic en la pantalla. */
  private actualizarVista(): void {
    queueMicrotask(() => {
      this.detector.markForCheck();
      this.detector.detectChanges();
    });
  }
}
