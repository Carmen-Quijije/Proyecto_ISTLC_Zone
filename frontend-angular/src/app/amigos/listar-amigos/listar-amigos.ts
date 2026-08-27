// Red de amigos: muestra perfiles existentes desde el inicio y permite buscar, seguir o dejar de seguir.
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
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
  mensaje = '';
  constructor(
    private route: ActivatedRoute,
    private amigosService: AmigosService,
    private perfilService: PerfilService,
    public autenticacionService: AutenticacionService,
  ) {}
  ngOnInit(): void {
    this.route.queryParamMap.subscribe((p) => {
      this.perfilId = Number(p.get('id') || this.autenticacionService.usuario()?.id || 0);
      this.cargar();
    });
  }
  cargar(): void {
    const actual = this.autenticacionService.usuario()?.id;
    if (!actual || !this.perfilId) return;
    this.perfilService.obtener(this.perfilId, actual).subscribe((r) => {
      this.perfil = r.usuario;
      this.seguidores = r.seguidores;
      this.seguidos = r.seguidos;
    });
    this.amigosService.listarSiguiendo(this.perfilId, actual).subscribe((r) => (this.miRed = r));
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
      },
      error: () => {
        this.mensaje = 'No se pudieron cargar los perfiles.';
        this.cargando = false;
      },
    });
  }
  alternar(persona: Usuario): void {
    const id = this.autenticacionService.usuario()?.id;
    if (!id) return;
    if (persona.siguiendo) {
      this.amigosService.dejarDeSeguir(id, persona.id).subscribe(() => {
        persona.siguiendo = false;
        this.miRed = this.miRed.filter((p) => p.id !== persona.id);
      });
    } else {
      this.amigosService
        .seguir(id, persona.id)
        .subscribe(() => (persona.solicitudPendiente = true));
    }
  }
}
