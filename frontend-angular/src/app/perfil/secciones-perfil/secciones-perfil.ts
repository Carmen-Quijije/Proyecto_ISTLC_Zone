// Secciones secundarias del perfil: información, fotos, cumpleaños y actividad.
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AmigosService } from '../../amigos/amigos-service';
import { AutenticacionService } from '../../autenticacion/autenticacion-service';
import { PerfilRespuesta, Publicacion, Usuario } from '../../core/modelos';
import { PublicacionesService } from '../../muro/publicaciones-service';
import { PerfilService } from '../perfil-service';

@Component({
  selector: 'app-secciones-perfil',
  imports: [RouterLink, MatCardModule, MatIconModule, MatButtonModule],
  templateUrl: './secciones-perfil.html',
  styleUrl: './secciones-perfil.css',
})
export class SeccionesPerfil implements OnInit {
  seccion = 'informacion';
  perfilId = 0;
  perfil?: Usuario;
  respuesta?: PerfilRespuesta;
  publicaciones: Publicacion[] = [];
  amigos: Usuario[] = [];
  actividades: any[] = [];
  constructor(
    private route: ActivatedRoute,
    private perfilService: PerfilService,
    private amigosService: AmigosService,
    private auth: AutenticacionService,
    private publicacionesService: PublicacionesService,
  ) {}
  ngOnInit(): void {
    this.route.data.subscribe((d) => {
      this.seccion = d['seccion'];
      this.route.queryParamMap.subscribe((p) => {
        this.perfilId = Number(p.get('id') || this.auth.usuario()?.id || 0);
        this.cargar();
      });
    });
  }
  cargar(): void {
    const actual = this.auth.usuario()?.id;
    if (!actual || !this.perfilId) return;
    this.perfilService.obtener(this.perfilId, actual).subscribe((r) => {
      this.respuesta = r;
      this.perfil = r.usuario;
      if (this.seccion === 'cumpleanos' && !this.esPropio)
        this.amigos = r.usuario.fechaNacimiento ? [r.usuario] : [];
    });
    if (this.seccion === 'fotos')
      this.perfilService
        .obtenerPublicaciones(this.perfilId, actual)
        .subscribe((p) => (this.publicaciones = p));
    if (this.seccion === 'cumpleanos' && this.esPropio)
      this.amigosService
        .listarSiguiendo(this.perfilId, actual)
        .subscribe(
          (a) =>
            (this.amigos = a
              .filter((x) => !!x.fechaNacimiento)
              .sort((a, b) => this.dias(a.fechaNacimiento) - this.dias(b.fechaNacimiento))),
        );
    if (this.seccion === 'actividad')
      this.perfilService.obtenerActividad(this.perfilId).subscribe((a) => (this.actividades = a));
  }
  get fotos(): string[] {
    return [...new Set(this.publicaciones.flatMap((p) => this.fotosPublicacion(p)))];
  }
  get gruposFotos(): { clave: string; titulo: string; fotos: string[] }[] {
    const grupos = new Map<string, string[]>();
    const agregadas = new Set<string>();
    for (const publicacion of this.publicaciones) {
      const fotos = this.fotosPublicacion(publicacion).filter((foto) => {
        if (agregadas.has(foto)) return false;
        agregadas.add(foto);
        return true;
      });
      if (!fotos.length) continue;
      const fecha = new Date(publicacion.fecha);
      const clave = Number.isNaN(fecha.getTime())
        ? 'sin-fecha'
        : `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
      grupos.set(clave, [...(grupos.get(clave) ?? []), ...fotos]);
    }
    return [...grupos.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([clave, fotos]) => ({
        clave,
        titulo:
          clave === 'sin-fecha'
            ? 'fecha no registrada'
            : new Date(`${clave}T12:00:00`).toLocaleDateString('es-EC', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              }),
        fotos,
      }));
  }
  get tituloCumpleanos(): string {
    return this.esPropio ? 'Próximos cumpleaños' : 'Cumpleaños del perfil';
  }
  get esPropio(): boolean {
    return this.perfilId === this.auth.usuario()?.id;
  }
  seguir(): void {
    const actual = this.auth.usuario()?.id;
    if (!actual) return;
    this.amigosService.seguir(actual, this.perfilId).subscribe(() => {
      if (this.respuesta) this.respuesta.solicitudPendiente = true;
    });
  }
  dejarDeSeguir(): void {
    const actual = this.auth.usuario()?.id;
    if (!actual) return;
    this.amigosService.dejarDeSeguir(actual, this.perfilId).subscribe(() => {
      if (this.respuesta) this.respuesta.siguiendo = false;
    });
  }
  reportar(): void {
    const actual = this.auth.usuario()?.id;
    const motivo = window.prompt('Motivo del reporte')?.trim();
    if (!actual || !motivo) return;
    this.publicacionesService.reportar('perfil', this.perfilId, actual, motivo).subscribe();
  }
  dias(fecha?: string): number {
    if (!fecha) return 366;
    const f = this.fechaLocal(fecha);
    if (!f) return 366;
    const ahora = new Date();
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    let proxima = new Date(hoy.getFullYear(), f.getMonth(), f.getDate());
    if (proxima < hoy) proxima = new Date(hoy.getFullYear() + 1, f.getMonth(), f.getDate());
    return Math.round((proxima.getTime() - hoy.getTime()) / 86400000);
  }
  fecha(valor?: string): string {
    const fecha = this.fechaLocal(valor);
    return fecha
      ? fecha.toLocaleDateString('es-EC', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : 'No registrado';
  }
  private fotosPublicacion(publicacion: Publicacion): string[] {
    const fotos = Array.isArray(publicacion.imagenes) ? publicacion.imagenes.filter(Boolean) : [];
    if (publicacion.imagenUrl) fotos.push(publicacion.imagenUrl);
    return [...new Set(fotos)];
  }
  private fechaLocal(valor?: string): Date | undefined {
    const coincidencia = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor ?? '');
    if (!coincidencia) return undefined;
    const fecha = new Date(
      Number(coincidencia[1]),
      Number(coincidencia[2]) - 1,
      Number(coincidencia[3]),
    );
    return Number.isNaN(fecha.getTime()) ? undefined : fecha;
  }
}
