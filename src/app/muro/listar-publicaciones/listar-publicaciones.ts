// Componente principal del muro: consulta, crea y reacciona a publicaciones.
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AutenticacionService } from '../../autenticacion/autenticacion-service';
import { Publicacion, PublicacionesService } from '../publicaciones-service';

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
export class ListarPublicaciones implements OnInit {
  // Colección visible y texto enlazado al editor de publicación.
  publicaciones: Publicacion[] = [];
  contenido = '';

  constructor(
    private publicacionesService: PublicacionesService,
    public autenticacionService: AutenticacionService,
  ) {}
  /** Carga el feed del usuario cuando se abre el componente. */
  ngOnInit(): void {
    const id = this.autenticacionService.usuario()?.id;
    if (id)
      this.publicacionesService.obtenerMuro(id).subscribe({
        next: (datos) => (this.publicaciones = datos),
        error: () => (this.publicaciones = []),
      });
  }
  /** Publica el texto escrito y agrega la respuesta al inicio del muro. */
  publicar(): void {
    const id = this.autenticacionService.usuario()?.id;
    if (!id || !this.contenido.trim()) return;
    this.publicacionesService.crear(id, this.contenido).subscribe((publicacion) => {
      this.publicaciones.unshift(publicacion);
      this.contenido = '';
    });
  }
  /** Registra un Me gusta y actualiza el contador de la tarjeta. */
  indicarMeGusta(publicacion: Publicacion): void {
    const id = this.autenticacionService.usuario()?.id;
    if (!id) return;
    this.publicacionesService
      .indicarMeGusta(publicacion.id, id)
      .subscribe(() => (publicacion.likes = (publicacion.likes ?? 0) + 1));
  }
}
