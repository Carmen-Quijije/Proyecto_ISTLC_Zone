// Pantalla de búsqueda de personas y creación de relaciones de seguimiento.
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AutenticacionService } from '../../autenticacion/autenticacion-service';
import { AmigosService } from '../amigos-service';

@Component({
  selector: 'app-listar-amigos',
  imports: [
    FormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './listar-amigos.html',
  styleUrl: './listar-amigos.css',
})
export class ListarAmigos {
  // Texto de búsqueda y resultados recibidos desde el backend.
  termino = '';
  personas: any[] = [];

  // Los servicios se usan para consultar personas y recuperar la sesión.
  constructor(
    private amigosService: AmigosService,
    private autenticacionService: AutenticacionService,
  ) {}
  /** Busca personas usando el texto escrito y el usuario autenticado. */
  buscar(): void {
    const id = this.autenticacionService.usuario()?.id;
    if (id)
      this.amigosService
        .buscar(this.termino, id)
        .subscribe((personas) => (this.personas = personas));
  }
  /** Sigue a la persona seleccionada y actualiza el botón localmente. */
  seguir(persona: any): void {
    const id = this.autenticacionService.usuario()?.id;
    if (id) this.amigosService.seguir(id, persona.id).subscribe(() => (persona.siguiendo = true));
  }
}
