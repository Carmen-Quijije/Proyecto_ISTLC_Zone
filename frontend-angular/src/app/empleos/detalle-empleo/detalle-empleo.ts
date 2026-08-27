import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-detalle-empleo',
  imports: [RouterLink, MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './detalle-empleo.html',
  styleUrl: './detalle-empleo.css',
})
export class DetalleEmpleo {
  empleo: any = JSON.parse(localStorage.getItem('empleoSeleccionado') || 'null');
  titulo(valor?: string): string {
    return (valor || 'Vacante disponible')
      .replace(/\s*-?\s*\(?m\/[fw]\/[dd]\)?/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
  fecha(timestamp?: number): string {
    return timestamp
      ? new Date(Number(timestamp) * 1000).toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })
      : 'No disponible';
  }
}
