// Muro social equivalente a la versión original: perfil, publicaciones, comentarios y sugerencias.
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { forkJoin } from 'rxjs';
import { AmigosService } from '../../amigos/amigos-service';
import { AutenticacionService } from '../../autenticacion/autenticacion-service';
import { Comentario, Publicacion, Usuario } from '../../core/modelos';
import { PerfilService } from '../../perfil/perfil-service';
import { PublicacionesService } from '../publicaciones-service';

@Component({
  selector: 'app-listar-publicaciones',
  imports: [
    FormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './listar-publicaciones.html',
  styleUrl: './listar-publicaciones.css',
})
export class ListarPublicaciones implements OnInit {
  publicaciones: Publicacion[] = [];
  perfil?: Usuario;
  seguidores = 0;
  seguidos = 0;
  sugerencias: Usuario[] = [];
  contenido = '';
  archivos: File[] = [];
  previews: string[] = [];
  comentarios: Record<number, Comentario[]> = {};
  comentariosVisibles = new Set<number>();
  textosComentario: Record<number, string> = {};
  respuestasComentario: Record<number, Comentario | undefined> = {};
  compartirPublicacionId?: number;
  contactosCompartir: Usuario[] = [];
  imagenesVisor: string[] = [];
  indiceVisor = 0;
  publicando = false;
  mensaje = '';

  constructor(
    private publicacionesService: PublicacionesService,
    private perfilService: PerfilService,
    private amigosService: AmigosService,
    public autenticacionService: AutenticacionService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.cargarTodo();
  }

  cargarTodo(): void {
    const id = this.autenticacionService.usuario()?.id;
    if (!id) return;
    this.publicacionesService
      .obtenerMuro(id)
      .subscribe({
        next: (datos) => {
          this.publicaciones = datos;
          this.enfocarPublicacionDesdeUrl();
        },
        error: () => (this.mensaje = 'No se pudo cargar el muro.'),
      });
    this.perfilService.obtener(id, id).subscribe((respuesta) => {
      this.perfil = respuesta.usuario;
      this.seguidores = respuesta.seguidores;
      this.seguidos = respuesta.seguidos;
    });
    this.amigosService
      .buscar('', id)
      .subscribe(
        (usuarios) => (this.sugerencias = usuarios.filter((u) => !u.siguiendo).slice(0, 4)),
      );
    this.amigosService
      .listarSiguiendo(id, id)
      .subscribe((usuarios) => (this.contactosCompartir = usuarios));
  }

  seleccionarImagenes(evento: Event): void {
    this.archivos = Array.from((evento.target as HTMLInputElement).files ?? []).slice(0, 4);
    this.previews.forEach((url) => URL.revokeObjectURL(url));
    this.previews = this.archivos.map((archivo) => URL.createObjectURL(archivo));
  }

  publicar(): void {
    const id = this.autenticacionService.usuario()?.id;
    if (!id || (!this.contenido.trim() && !this.archivos.length)) return;
    this.publicando = true;
    const crear = (urls: string[]) =>
      this.publicacionesService.crear(id, this.contenido.trim(), urls).subscribe({
        next: () => {
          this.contenido = '';
          this.archivos = [];
          this.previews = [];
          this.publicando = false;
          this.cargarTodo();
        },
        error: (error) => {
          this.mensaje = error.error?.message || 'No se pudo publicar.';
          this.publicando = false;
        },
      });
    if (!this.archivos.length) {
      crear([]);
      return;
    }
    forkJoin(
      this.archivos.map((archivo) => this.publicacionesService.subirImagen(archivo)),
    ).subscribe({
      next: (respuestas) => crear(respuestas.map((respuesta) => respuesta.url)),
      error: () => {
        this.mensaje = 'No se pudieron subir las imágenes.';
        this.publicando = false;
      },
    });
  }

  cambiarMeGusta(publicacion: Publicacion): void {
    const id = this.autenticacionService.usuario()?.id;
    if (!id) return;
    this.publicacionesService
      .cambiarMeGusta(publicacion.id, id, publicacion.likedByMe)
      .subscribe(() => {
        publicacion.totalLikes += publicacion.likedByMe ? -1 : 1;
        publicacion.likedByMe = !publicacion.likedByMe;
      });
  }

  mostrarComentarios(publicacion: Publicacion): void {
    if (this.comentariosVisibles.has(publicacion.id)) {
      this.comentariosVisibles.delete(publicacion.id);
      return;
    }
    this.comentariosVisibles.add(publicacion.id);
    this.cargarComentarios(publicacion.id);
  }

  cargarComentarios(publicacionId: number): void {
    this.publicacionesService
      .obtenerComentarios(publicacionId)
      .subscribe((datos) => (this.comentarios[publicacionId] = datos));
  }

  comentar(publicacion: Publicacion): void {
    const id = this.autenticacionService.usuario()?.id;
    const texto = this.textosComentario[publicacion.id]?.trim();
    if (!id || !texto) return;
    const padre = this.respuestasComentario[publicacion.id]?.id;
    this.publicacionesService.comentar(publicacion.id, id, texto, padre).subscribe(() => {
      this.textosComentario[publicacion.id] = '';
      this.respuestasComentario[publicacion.id] = undefined;
      publicacion.totalComentarios++;
      this.cargarComentarios(publicacion.id);
    });
  }

  prepararRespuesta(publicacionId: number, comentario: Comentario): void {
    this.respuestasComentario[publicacionId] = comentario;
  }

  cancelarRespuesta(publicacionId: number): void {
    this.respuestasComentario[publicacionId] = undefined;
  }

  esComentarioPropio(comentario: Comentario): boolean {
    return comentario.autor.id === this.autenticacionService.usuario()?.id;
  }

  editarComentario(publicacion: Publicacion, comentario: Comentario): void {
    const id = this.autenticacionService.usuario()?.id;
    const contenido = window.prompt('Editar comentario', comentario.contenido)?.trim();
    if (!id || !contenido) return;
    this.publicacionesService
      .editarComentario(publicacion.id, comentario.id, id, contenido)
      .subscribe(() => this.cargarComentarios(publicacion.id));
  }

  eliminarComentario(publicacion: Publicacion, comentario: Comentario): void {
    const id = this.autenticacionService.usuario()?.id;
    if (!id || !window.confirm('¿Quieres eliminar este comentario?')) return;
    this.publicacionesService
      .eliminarComentario(publicacion.id, comentario.id, id)
      .subscribe(() => {
        publicacion.totalComentarios = Math.max(0, publicacion.totalComentarios - 1);
        this.cargarComentarios(publicacion.id);
      });
  }

  reportarComentario(comentario: Comentario): void {
    const id = this.autenticacionService.usuario()?.id;
    const motivo = window.prompt('Cuéntanos el motivo del reporte')?.trim();
    if (!id || !motivo) return;
    this.publicacionesService
      .reportar('comentario', comentario.id, id, motivo)
      .subscribe(() => (this.mensaje = 'Reporte enviado a moderación.'));
  }

  editarPublicacion(publicacion: Publicacion): void {
    const id = this.autenticacionService.usuario()?.id;
    const contenido = window.prompt('Editar publicación', publicacion.contenido)?.trim();
    if (!id || contenido === undefined || contenido === null) return;
    this.publicacionesService
      .editar(publicacion.id, id, contenido, publicacion.imagenes)
      .subscribe(() => (publicacion.contenido = contenido));
  }

  eliminarPublicacion(publicacion: Publicacion): void {
    const id = this.autenticacionService.usuario()?.id;
    if (!id || !window.confirm('¿Eliminar esta publicación?')) return;
    this.publicacionesService
      .eliminar(publicacion.id, id)
      .subscribe(
        () =>
          (this.publicaciones = this.publicaciones.filter((item) => item.id !== publicacion.id)),
      );
  }

  reportar(publicacion: Publicacion): void {
    const id = this.autenticacionService.usuario()?.id;
    const motivo = window.prompt('Indica el motivo del reporte')?.trim();
    if (!id || !motivo) return;
    this.publicacionesService
      .reportar('publicacion', publicacion.id, id, motivo)
      .subscribe(() => (this.mensaje = 'Reporte enviado a moderación.'));
  }

  abrirCompartir(publicacion: Publicacion): void {
    this.compartirPublicacionId =
      this.compartirPublicacionId === publicacion.id ? undefined : publicacion.id;
  }

  compartirEnPerfil(publicacion: Publicacion): void {
    const id = this.autenticacionService.usuario()?.id;
    if (!id) return;
    this.publicacionesService
      .compartirEnPerfil(publicacion.id, id)
      .subscribe(() => {
        this.mensaje = 'Publicación compartida en tu perfil.';
        this.compartirPublicacionId = undefined;
      });
  }

  compartirPorMensaje(publicacion: Publicacion, contacto: Usuario): void {
    const id = this.autenticacionService.usuario()?.id;
    if (!id) return;
    this.publicacionesService
      .compartirPorMensaje(publicacion.id, id, contacto.id)
      .subscribe(() => {
        this.mensaje = `Publicación enviada a ${contacto.nombre}.`;
        this.compartirPublicacionId = undefined;
      });
  }

  abrirVisor(imagenes: string[], indice: number): void {
    this.imagenesVisor = imagenes;
    this.indiceVisor = indice;
  }

  cerrarVisor(): void {
    this.imagenesVisor = [];
  }

  moverVisor(direccion: number): void {
    this.indiceVisor =
      (this.indiceVisor + direccion + this.imagenesVisor.length) % this.imagenesVisor.length;
  }

  private enfocarPublicacionDesdeUrl(): void {
    const id = Number(this.route.snapshot.queryParamMap.get('publicacion') || 0);
    if (!id) return;
    const publicacion = this.publicaciones.find((item) => item.id === id);
    if (publicacion && this.route.snapshot.queryParamMap.get('comentarios'))
      this.mostrarComentarios(publicacion);
    setTimeout(() => document.getElementById(`publicacion-${id}`)?.scrollIntoView({ behavior: 'smooth' }));
  }

  seguir(persona: Usuario): void {
    const id = this.autenticacionService.usuario()?.id;
    if (!id) return;
    this.amigosService.seguir(id, persona.id).subscribe(() => (persona.solicitudPendiente = true));
  }

  esPropia(publicacion: Publicacion): boolean {
    return publicacion.autor.id === this.autenticacionService.usuario()?.id;
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' });
  }
}
