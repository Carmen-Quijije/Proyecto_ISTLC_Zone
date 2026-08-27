// Catálogo estático de accesos a las plataformas institucionales.
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-listar-plataformas',
  imports: [RouterLink, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './listar-plataformas.html',
  styleUrl: './listar-plataformas.css',
})
export class ListarPlataformas {
  // Cada elemento contiene la imagen, descripción y URL externa de la plataforma.
  plataformas = [
    {
      nombre: 'Campus Moodle',
      imagen: 'assets/images/moodle.JPG',
      descripcion: 'Aulas virtuales, recursos y actividades académicas.',
      url: 'https://moodle.tecnologicoliceocristiano.edu.ec/campus/',
    },
    {
      nombre: 'Sistema de Gestión Académica',
      imagen: 'assets/images/sga.JPG',
      descripcion: 'Consulta de notas, matrículas e información estudiantil.',
      url: 'https://sga.tecnologicoliceocristiano.edu.ec/Login/Login',
    },
    {
      nombre: 'Sitio institucional',
      imagen: 'assets/images/istlc.JPG',
      descripcion: 'Noticias y servicios del Instituto Superior Tecnológico Liceo Cristiano.',
      url: 'https://www.tecnologicoliceocristiano.edu.ec/',
    },
  ];
}
