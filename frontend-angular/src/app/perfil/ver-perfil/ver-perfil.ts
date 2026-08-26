// Pantalla de consulta de información personal y académica.
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { AutenticacionService } from '../../autenticacion/autenticacion-service';
import { PerfilService } from '../perfil-service';

@Component({
  selector: 'app-ver-perfil',
  imports: [RouterLink, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './ver-perfil.html',
  styleUrl: './ver-perfil.css',
})
export class VerPerfil implements OnInit {
  // Objeto devuelto por el backend con los datos del perfil.
  perfil: any;

  constructor(
    private perfilService: PerfilService,
    private autenticacionService: AutenticacionService,
  ) {}
  /** Consulta el perfil del usuario; usa la sesión como respaldo ante errores. */
  ngOnInit(): void {
    const id = this.autenticacionService.usuario()?.id;
    if (id)
      this.perfilService.obtener(id).subscribe({
        next: (datos) => (this.perfil = datos),
        error: () => (this.perfil = this.autenticacionService.usuario()),
      });
  }
}
