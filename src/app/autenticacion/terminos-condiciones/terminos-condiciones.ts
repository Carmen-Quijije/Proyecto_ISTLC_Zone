// Componente informativo que muestra las condiciones de uso del sistema.
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-terminos-condiciones',
  imports: [RouterLink, MatCardModule, MatButtonModule],
  templateUrl: './terminos-condiciones.html',
  styleUrl: './terminos-condiciones.css',
})
export class TerminosCondiciones {}
