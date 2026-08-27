// Mensajería con conversaciones, búsqueda de contactos y actualización automática.
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
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
  private temporizador?: ReturnType<typeof setInterval>;
  constructor(
    private mensajesService: MensajesService,
    private amigosService: AmigosService,
    public autenticacionService: AutenticacionService,
    private route: ActivatedRoute,
  ) {}
  ngOnInit(): void {
    this.cargarContactos();
    this.temporizador = setInterval(() => this.refrescar(), 5000);
  }
  ngOnDestroy(): void {
    if (this.temporizador) clearInterval(this.temporizador);
  }
  cargarContactos(): void {
    const id = this.autenticacionService.usuario()?.id;
    if (!id) return;
    this.mensajesService.listarConversaciones(id).subscribe((conversaciones) =>
      this.amigosService.listarSiguiendo(id, id).subscribe((amigos) => {
        const mapa = new Map<number, Usuario>();
        [...amigos, ...conversaciones].forEach((c) =>
          mapa.set(c.id, { ...mapa.get(c.id), ...c } as Usuario),
        );
        this.contactos = [...mapa.values()];
        this.filtrar();
        const contactoId = Number(this.route.snapshot.queryParamMap.get('contacto') || 0);
        if (contactoId && this.contacto?.id !== contactoId) {
          const seleccionado = this.contactos.find((c) => c.id === contactoId);
          if (seleccionado) this.abrir(seleccionado);
        }
      }),
    );
  }
  filtrar(): void {
    const q = this.busqueda.toLowerCase().trim();
    this.contactosFiltrados = this.contactos.filter(
      (c) => !q || c.nombre.toLowerCase().includes(q) || c.usuario.toLowerCase().includes(q),
    );
  }
  abrir(contacto: Usuario): void {
    this.contacto = contacto;
    this.obtenerChat();
  }
  obtenerChat(): void {
    const id = this.autenticacionService.usuario()?.id;
    if (!id || !this.contacto) return;
    this.mensajesService.obtenerMensajes(id, this.contacto.id).subscribe((r) => {
      this.contacto = r.contacto;
      this.mensajes = r.mensajes;
    });
  }
  enviar(): void {
    const id = this.autenticacionService.usuario()?.id;
    const contenido = this.texto.trim();
    if (!id || !this.contacto || !contenido) return;
    this.mensajesService.enviar(id, this.contacto.id, contenido).subscribe(() => {
      this.texto = '';
      this.obtenerChat();
      this.cargarContactos();
    });
  }
  private refrescar(): void {
    this.cargarContactos();
    if (this.contacto) this.obtenerChat();
  }
  hora(fecha?: string): string {
    return fecha
      ? new Date(fecha).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })
      : '';
  }
}
