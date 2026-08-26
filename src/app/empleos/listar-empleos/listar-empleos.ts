// Pantalla que consume y presenta ofertas de una API pública de empleos.
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-listar-empleos',
  imports: [MatCardModule, MatButtonModule, MatChipsModule, MatIconModule],
  templateUrl: './listar-empleos.html',
  styleUrl: './listar-empleos.css',
})
export class ListarEmpleos implements OnInit {
  // Primeras doce ofertas que se representarán como tarjetas Material.
  empleos: any[] = [];

  constructor(private http: HttpClient) {}

  /** Consulta el portal externo al iniciar y controla una respuesta fallida. */
  ngOnInit(): void {
    this.http.get<any>('https://www.arbeitnow.com/api/job-board-api').subscribe({
      next: (respuesta) => (this.empleos = (respuesta.data ?? []).slice(0, 12)),
      error: () => (this.empleos = []),
    });
  }
  /** Elimina etiquetas HTML y limita la descripción mostrada en cada tarjeta. */
  resumen(html: string): string {
    return (html ?? '').replace(/<[^>]*>/g, ' ').slice(0, 220);
  }
}
