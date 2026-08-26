// Página de respaldo utilizada por la ruta comodín del Router.
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-pagina-no-encontrada',
  imports: [RouterLink, MatButtonModule, MatIconModule],
  templateUrl: './pagina-no-encontrada.html',
  styleUrl: './pagina-no-encontrada.css',
})
export class PaginaNoEncontrada {}
