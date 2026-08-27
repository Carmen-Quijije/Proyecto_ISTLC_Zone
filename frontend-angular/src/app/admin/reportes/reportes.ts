// Panel disponible para administradores que revisan reportes de la comunidad.
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { AutenticacionService } from '../../autenticacion/autenticacion-service';

@Component({
  selector: 'app-reportes',
  imports: [RouterLink, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './reportes.html',
  styleUrl: './reportes.css',
})
export class Reportes implements OnInit {
  reportes: any[] = [];
  mensaje = '';
  private readonly apiUrl = '/api/auth';
  constructor(
    private http: HttpClient,
    public auth: AutenticacionService,
  ) {}
  ngOnInit(): void {
    this.cargar();
  }
  cargar(): void {
    const id = this.auth.usuario()?.id;
    if (!id) return;
    this.http
      .get<any>(`${this.apiUrl}/reports?usuarioId=${id}`)
      .subscribe({
        next: (r) => (this.reportes = r.reportes),
        error: (e) => (this.mensaje = e.error?.message || 'No se pudieron cargar los reportes.'),
      });
  }
  actualizar(reporte: any, estado: 'revisado' | 'descartado'): void {
    const usuarioId = this.auth.usuario()?.id;
    this.http
      .put(`${this.apiUrl}/reports/${reporte.id}/status`, { usuarioId, estado })
      .subscribe(() => {
        reporte.estado = estado;
      });
  }
  detalle(reporte: any): string {
    return (
      reporte.objetivo?.perfil ||
      reporte.objetivo?.publicacion ||
      reporte.objetivo?.comentario ||
      'Contenido no disponible'
    );
  }
  destino(reporte: any): string {
    return reporte.tipo === 'perfil' ? '/perfil' : '/muro';
  }
  parametros(reporte: any): Record<string, number> {
    return reporte.tipo === 'perfil'
      ? { id: Number(reporte.referenciaId) }
      : {
          publicacion: Number(
            reporte.tipo === 'comentario'
              ? reporte.objetivo?.comentarioPublicacionId
              : reporte.referenciaId,
          ),
        };
  }
}
