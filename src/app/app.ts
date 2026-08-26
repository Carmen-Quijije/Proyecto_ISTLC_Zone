// Componente raíz: reúne la navegación global y el área donde se muestran las rutas.
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AutenticacionService } from './autenticacion/autenticacion-service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  // El servicio es público porque la plantilla consulta el estado de autenticación.
  constructor(public autenticacionService: AutenticacionService) {}
}
