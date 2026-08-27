// Perfil completo con datos, red y publicaciones, compatible con perfiles propios y ajenos.
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin } from 'rxjs';
import { AmigosService } from '../../amigos/amigos-service';
import { AutenticacionService } from '../../autenticacion/autenticacion-service';
import { PerfilRespuesta, Publicacion, Usuario } from '../../core/modelos';
import { PublicacionesService } from '../../muro/publicaciones-service';
import { PerfilService } from '../perfil-service';

@Component({
  selector: 'app-ver-perfil',
  imports: [RouterLink, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './ver-perfil.html',
  styleUrl: './ver-perfil.css',
})
export class VerPerfil implements OnInit {
  perfilId = 0;
  perfil?: Usuario;
  respuesta?: PerfilRespuesta;
  publicaciones: Publicacion[] = [];
  amigos: Usuario[] = [];
  cargando = true;
  mensaje = '';
  private solicitudPerfil = 0;
  constructor(
    private route: ActivatedRoute,
    private perfilService: PerfilService,
    private amigosService: AmigosService,
    private publicacionesService: PublicacionesService,
    public autenticacionService: AutenticacionService,
  ) {}
  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) =>
      this.cargar(Number(params.get('id') || this.autenticacionService.usuario()?.id || 0)),
    );
  }
  cargar(id: number): void {
    const usuarioSesion = this.autenticacionService.usuario();
    const actual = usuarioSesion?.id;
    if (!id || !actual || !usuarioSesion) return;
    const solicitud = ++this.solicitudPerfil;
    this.perfilId = id;
    this.mensaje = '';
    this.publicaciones = [];
    this.amigos = [];

    // El perfil propio se muestra de inmediato con la información guardada al iniciar sesión.
    if (id === actual) {
      this.perfil = usuarioSesion;
      this.respuesta = {
        success: true,
        usuario: usuarioSesion,
        seguidores: 0,
        seguidos: 0,
        siguiendo: false,
        solicitudPendiente: false,
      };
      this.cargando = false;
    } else {
      this.perfil = undefined;
      this.respuesta = undefined;
      this.cargando = true;
    }

    this.perfilService.obtener(id, actual).subscribe({
      next: (r) => {
        if (solicitud !== this.solicitudPerfil || id !== this.perfilId) return;
        this.respuesta = r;
        this.perfil = r.usuario;
        this.cargando = false;
      },
      error: () => {
        if (solicitud !== this.solicitudPerfil || id !== this.perfilId) return;
        this.mensaje =
          id === actual
            ? 'No se pudo actualizar la información del perfil desde el servidor.'
            : 'No se pudo cargar el perfil solicitado.';
        this.cargando = false;
      },
    });
    this.perfilService.obtenerPublicaciones(id, actual).subscribe({
      next: (publicaciones) => {
        if (solicitud === this.solicitudPerfil && id === this.perfilId)
          this.publicaciones = publicaciones;
      },
      error: () => {
        if (solicitud === this.solicitudPerfil && id === this.perfilId)
          this.publicaciones = [];
      },
    });
    this.amigosService.listarSiguiendo(id, actual).subscribe({
      next: (amigos) => {
        if (solicitud === this.solicitudPerfil && id === this.perfilId) this.amigos = amigos;
      },
      error: () => {
        if (solicitud === this.solicitudPerfil && id === this.perfilId) this.amigos = [];
      },
    });
  }
  get esPropio(): boolean {
    return this.perfilId === this.autenticacionService.usuario()?.id;
  }
  seguir(): void {
    const actual = this.autenticacionService.usuario()?.id;
    if (!actual || !this.perfil) return;
    this.amigosService.seguir(actual, this.perfil.id).subscribe(() => {
      if (this.respuesta) this.respuesta.solicitudPendiente = true;
    });
  }
  dejarDeSeguir(): void {
    const actual = this.autenticacionService.usuario()?.id;
    if (!actual || !this.perfil) return;
    this.amigosService.dejarDeSeguir(actual, this.perfil.id).subscribe(() => {
      if (this.respuesta) this.respuesta.siguiendo = false;
    });
  }
  reportar(): void {
    const actual = this.autenticacionService.usuario()?.id;
    const motivo = window.prompt('Motivo del reporte')?.trim();
    if (!actual || !this.perfil || !motivo) return;
    this.publicacionesService
      .reportar('perfil', this.perfil.id, actual, motivo)
      .subscribe(() => (this.mensaje = 'Reporte enviado a moderación.'));
  }
  editarPublicacion(publicacion: Publicacion): void {
    const usuarioId = this.autenticacionService.usuario()?.id;
    const contenido = window.prompt('Editar publicación', publicacion.contenido)?.trim();
    if (!usuarioId || contenido === undefined || contenido === null) return;
    this.publicacionesService
      .editar(publicacion.id, usuarioId, contenido, publicacion.imagenes)
      .subscribe(() => (publicacion.contenido = contenido));
  }
  agregarImagenes(publicacion: Publicacion): void {
    const usuarioId = this.autenticacionService.usuario()?.id;
    if (!usuarioId || publicacion.imagenes.length >= 6) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = () => {
      const archivos = Array.from(input.files ?? []).slice(0, 6 - publicacion.imagenes.length);
      if (!archivos.length) return;
      forkJoin(archivos.map((archivo) => this.publicacionesService.subirImagen(archivo))).subscribe(
        (respuestas) => {
          const imagenes = [...publicacion.imagenes, ...respuestas.map((r) => r.url)];
          this.publicacionesService
            .editar(publicacion.id, usuarioId, publicacion.contenido, imagenes)
            .subscribe(() => (publicacion.imagenes = imagenes));
        },
      );
    };
    input.click();
  }
  quitarImagen(publicacion: Publicacion, indice: number): void {
    const usuarioId = this.autenticacionService.usuario()?.id;
    if (!usuarioId) return;
    const imagenes = publicacion.imagenes.filter((_, i) => i !== indice);
    this.publicacionesService
      .editar(publicacion.id, usuarioId, publicacion.contenido, imagenes)
      .subscribe(() => (publicacion.imagenes = imagenes));
  }
  eliminarPublicacion(publicacion: Publicacion): void {
    const usuarioId = this.autenticacionService.usuario()?.id;
    if (!usuarioId || !window.confirm('¿Eliminar esta publicación?')) return;
    this.publicacionesService
      .eliminar(publicacion.id, usuarioId)
      .subscribe(() => (this.publicaciones = this.publicaciones.filter((p) => p.id !== publicacion.id)));
  }
  formatear(fecha: string): string {
    return new Date(fecha).toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' });
  }
}
