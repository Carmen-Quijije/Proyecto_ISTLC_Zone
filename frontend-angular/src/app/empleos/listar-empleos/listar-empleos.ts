// Pantalla que consume y presenta ofertas de una API pública de empleos.
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-listar-empleos',
  imports: [FormsModule, MatCardModule, MatButtonModule, MatChipsModule, MatIconModule, MatFormFieldModule, MatSelectModule, MatPaginatorModule],
  templateUrl: './listar-empleos.html',
  styleUrl: './listar-empleos.css',
})
export class ListarEmpleos implements OnInit {
  // Primeras doce ofertas que se representarán como tarjetas Material.
  empleos: any[] = [];
  empleosTodos: any[] = [];
  empleosFiltrados: any[] = [];
  filtroFecha = 'all';
  pagina = 0;
  tamanoPagina = 10;
  cargando = true;
  error = '';

  constructor(private http: HttpClient, private router: Router) {}

  /** Consulta el portal externo al iniciar y controla una respuesta fallida. */
  ngOnInit(): void {
    this.http.get<any>('https://www.arbeitnow.com/api/job-board-api').subscribe({
      next: (respuesta) => {
        this.empleosTodos = (respuesta.data ?? []).sort(
          (a: any, b: any) => Number(b.created_at) - Number(a.created_at),
        );
        this.aplicarFiltro();
        this.cargando = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar las ofertas desde la API.';
        this.cargando = false;
      },
    });
  }
  /** Elimina etiquetas HTML y limita la descripción mostrada en cada tarjeta. */
  resumen(html: string): string {
    const elemento = document.createElement('textarea');
    elemento.innerHTML = html ?? '';
    return elemento.value
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 220);
  }
  aplicarFiltro(): void {
    const hoy = new Date();
    this.empleosFiltrados = this.empleosTodos.filter((empleo) => {
      const fecha = new Date(Number(empleo.created_at) * 1000);
      if (this.filtroFecha === 'today') return fecha.toDateString() === hoy.toDateString();
      const limite = new Date(hoy);
      if (this.filtroFecha === 'week') limite.setDate(hoy.getDate() - 7);
      else if (this.filtroFecha === 'month') limite.setMonth(hoy.getMonth() - 1);
      else return true;
      return fecha >= limite;
    });
    this.pagina = 0;
    this.actualizarPagina();
  }
  /** Presenta únicamente el bloque seleccionado sin volver a consultar la API externa. */
  cambiarPagina(evento: PageEvent): void {
    this.pagina = evento.pageIndex;
    this.tamanoPagina = evento.pageSize;
    this.actualizarPagina();
  }
  private actualizarPagina(): void {
    const inicio = this.pagina * this.tamanoPagina;
    this.empleos = this.empleosFiltrados.slice(inicio, inicio + this.tamanoPagina);
  }
  abrirDetalle(empleo: any): void {
    localStorage.setItem('empleoSeleccionado', JSON.stringify(empleo));
    this.router.navigate(['/detalleEmpleo']);
  }
  titulo(valor: string): string {
    return (valor || 'Vacante disponible')
      .replace(/\s*-?\s*\(?m\/[fw]\/[dd]\)?/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
  fecha(timestamp: number): string {
    return new Date(Number(timestamp) * 1000).toLocaleDateString('es-EC', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  }
}
