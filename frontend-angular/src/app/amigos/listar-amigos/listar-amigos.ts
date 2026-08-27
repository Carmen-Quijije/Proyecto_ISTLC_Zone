// Red de amigos: muestra perfiles existentes desde el inicio y permite buscar, seguir o dejar de seguir.
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { catchError, forkJoin, of } from 'rxjs';
import { AutenticacionService } from '../../autenticacion/autenticacion-service';
import { Usuario } from '../../core/modelos';
import { PerfilService } from '../../perfil/perfil-service';
import { AmigosService } from '../amigos-service';

@Component({
  selector: 'app-listar-amigos',
  imports: [
    FormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './listar-amigos.html',
  styleUrl: './listar-amigos.css',
})
export class ListarAmigos implements OnInit {
  termino = '';
  personas: Usuario[] = [];
  miRed: Usuario[] = [];
  perfil?: Usuario;
  perfilId = 0;
  seguidores = 0;
  seguidos = 0;
  cargando = true;
  cargandoRed = true;
  mensaje = '';
  mensajeRed = '';
  esError = false;
  constructor(
    private route: ActivatedRoute,
    private amigosService: AmigosService,
    private perfilService: PerfilService,
    public autenticacionService: AutenticacionService,
    private detector: ChangeDetectorRef,
  ) {}
  ngOnInit(): void {
    this.route.queryParamMap.subscribe((p) => {
      this.perfilId = Number(p.get('id') || this.autenticacionService.usuario()?.id || 0);
      this.cargar();
      this.actualizarVista();
    });
  }
  cargar(): void {
    const usuarioSesion = this.autenticacionService.usuario();
    const actual = Number(usuarioSesion?.id || 0);
    if (!actual || !this.perfilId || !usuarioSesion) {
      this.mensajeRed = 'No se encontró la sesión del usuario.';
      this.cargandoRed = false;
      this.actualizarVista();
      return;
    }

    this.cargandoRed = true;
    this.mensajeRed = '';
    if (Number(this.perfilId) === actual) this.perfil = usuarioSesion;
    let errorPerfil = false;
    let errorRed = false;

    // Las dos respuestas se recuperan por separado para no ocultar amigos si falla el encabezado.
    forkJoin({
      perfil: this.perfilService.obtener(this.perfilId, actual).pipe(
        catchError(() => {
          errorPerfil = true;
          return of(null);
        }),
      ),
      red: this.amigosService.listarSiguiendo(this.perfilId, actual).pipe(
        catchError(() => {
          errorRed = true;
          return of([] as Usuario[]);
        }),
      ),
    }).subscribe(({ perfil, red }) => {
      if (perfil) {
        this.perfil = perfil.usuario;
        this.seguidores = Number(perfil.seguidores || 0);
        this.seguidos = Number(perfil.seguidos || 0);
      }
      this.miRed = red;
      this.seguidos = Math.max(this.seguidos, red.length);
      this.mensajeRed = errorRed
        ? 'No se pudo cargar la lista de amigos guardada en el servidor.'
        : errorPerfil
          ? 'Los amigos se cargaron, pero no se pudo actualizar la cabecera del perfil.'
          : '';
      this.cargandoRed = false;
    });
    this.buscar();
  }
  buscar(): void {
    const id = this.autenticacionService.usuario()?.id;
    if (!id) return;
    this.cargando = true;
    this.amigosService.buscar(this.termino, id).subscribe({
      next: (p) => {
        this.personas = p;
        this.cargando = false;
        this.actualizarVista();
      },
      error: () => {
        this.mensaje = 'No se pudieron cargar los perfiles.';
        this.esError = true;
        this.cargando = false;
        this.actualizarVista();
      },
    });
  }
  alternar(persona: Usuario): void {
    const id = this.autenticacionService.usuario()?.id;
    if (!id) return;
    if (persona.siguiendo) {
      this.amigosService.dejarDeSeguir(id, persona.id).subscribe({
        next: () => {
          persona.siguiendo = false;
          persona.solicitudPendiente = false;
          this.miRed = this.miRed.filter((p) => p.id !== persona.id);
          this.mensaje = `Ya no sigues a ${persona.nombre}.`;
          this.esError = false;
        },
        error: (error) => {
          this.mensaje = error.error?.message || 'No se pudo actualizar la lista de amigos.';
          this.esError = true;
        },
      });
    } else {
      this.amigosService.seguir(id, persona.id).subscribe({
        next: () => {
          persona.solicitudPendiente = true;
          this.mensaje = `Solicitud enviada a ${persona.nombre}.`;
          this.esError = false;
        },
        error: (error) => {
          this.mensaje = error.error?.message || 'No se pudo enviar la solicitud de amistad.';
          this.esError = true;
        },
      });
    }
  }
  private actualizarVista(): void {
    queueMicrotask(() => {
      this.detector.markForCheck();
      this.detector.detectChanges();
    });
  }
}
