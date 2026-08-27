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
    });
    if (this.seccion === 'fotos')
      this.perfilService
        .obtenerPublicaciones(this.perfilId, actual)
        .subscribe((p) => (this.publicaciones = p));
    if (this.seccion === 'cumpleanos')
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
    return this.publicaciones.flatMap((p) => p.imagenes);
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
    const hoy = new Date();
    const f = new Date(fecha);
    let proxima = new Date(hoy.getFullYear(), f.getMonth(), f.getDate());
    if (proxima < hoy) proxima = new Date(hoy.getFullYear() + 1, f.getMonth(), f.getDate());
    return Math.ceil((proxima.getTime() - hoy.getTime()) / 86400000);
  }
  fecha(valor?: string): string {
    return valor
      ? new Date(valor).toLocaleDateString('es-EC', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : 'No registrado';
  }
}
