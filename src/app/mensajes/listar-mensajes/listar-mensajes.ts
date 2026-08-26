// Pantalla de mensajería: lista conversaciones, historial y envío de mensajes.
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { AutenticacionService } from '../../autenticacion/autenticacion-service';
import { MensajesService } from '../mensajes-service';

@Component({
  selector: 'app-listar-mensajes',
  imports: [
    FormsModule,
    MatCardModule,
    MatListModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './listar-mensajes.html',
  styleUrl: './listar-mensajes.css',
})
export class ListarMensajes implements OnInit {
  // Estado necesario para representar los dos paneles de mensajería.
  conversaciones: any[] = [];
  mensajes: any[] = [];
  contacto: any;
  texto = '';
  // Servicios de datos y sesión utilizados por el componente.
  constructor(
    private mensajesService: MensajesService,
    public autenticacionService: AutenticacionService,
  ) {}
  /** Carga las conversaciones del usuario al entrar en la pantalla. */
  ngOnInit(): void {
    const id = this.autenticacionService.usuario()?.id;
    if (id)
      this.mensajesService
        .listarConversaciones(id)
        .subscribe((datos) => (this.conversaciones = datos));
  }
  /** Selecciona un contacto y recupera el historial correspondiente. */
  abrir(contacto: any): void {
    this.contacto = contacto;
    const id = this.autenticacionService.usuario()?.id;
    if (id)
      this.mensajesService
        .obtenerMensajes(id, contacto.id)
        .subscribe((datos) => (this.mensajes = datos));
  }
  /** Envía el texto escrito y lo agrega a la conversación visible. */
  enviar(): void {
    const id = this.autenticacionService.usuario()?.id;
    if (!id || !this.contacto || !this.texto.trim()) return;
    this.mensajesService.enviar(id, this.contacto.id, this.texto).subscribe((mensaje) => {
      this.mensajes.push(mensaje);
      this.texto = '';
    });
  }
}
