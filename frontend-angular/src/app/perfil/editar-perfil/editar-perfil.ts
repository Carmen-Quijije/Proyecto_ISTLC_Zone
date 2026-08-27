// Edición de todos los datos del perfil y carga de foto a Cloudinary.
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AutenticacionService } from '../../autenticacion/autenticacion-service';
import { CARRERAS, SEMESTRES, TIPOS_USUARIO } from '../../core/opciones-perfil';
import { PerfilService } from '../perfil-service';

@Component({
  selector: 'app-editar-perfil',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './editar-perfil.html',
  styleUrl: './editar-perfil.css',
})
export class EditarPerfil implements OnInit {
  private readonly fb = inject(FormBuilder);
  mensaje = '';
  esError = false;
  fotoPreview = 'assets/images/icono.png';
  archivo?: File;
  guardando = false;
  mostrarConfirmacionEliminar = false;
  eliminando = false;
  readonly tiposUsuario = TIPOS_USUARIO;
  readonly carreras = CARRERAS;
  readonly semestres = SEMESTRES;
  readonly formulario = this.fb.nonNullable.group({
    nombre: [''],
    viveEn: [''],
    lugarOrigen: [''],
    fechaNacimiento: [''],
    estadoCivil: [''],
    tipoUsuario: ['', Validators.required],
    carrera: ['', Validators.required],
    semestre: ['', Validators.required],
    bio: [''],
    fotoPerfil: [''],
  });
  constructor(
    private perfilService: PerfilService,
    private auth: AutenticacionService,
    private router: Router,
  ) {
    this.formulario.controls.carrera.disable({ emitEvent: false });
    this.formulario.controls.semestre.disable({ emitEvent: false });
    this.formulario.controls.tipoUsuario.valueChanges.subscribe((tipo) =>
      this.aplicarTipoUsuario(tipo),
    );
  }
  ngOnInit(): void {
    const id = this.auth.usuario()?.id;
    if (!id) return;
    this.perfilService.obtener(id, id).subscribe((r) => {
      const tipoUsuario =
        r.usuario.tipoUsuario || (r.usuario.carrera === 'Docente' ? 'Docente' : 'Estudiante');
      this.aplicarTipoUsuario(tipoUsuario, false);
      this.formulario.patchValue(
        {
          ...r.usuario,
          tipoUsuario,
          carrera: r.usuario.carrera === 'Docente' ? '' : r.usuario.carrera,
          semestre: tipoUsuario === 'Docente' ? 'No aplica' : r.usuario.semestre,
        },
        { emitEvent: false },
      );
      this.fotoPreview = r.usuario.fotoPerfil || this.fotoPreview;
    });
  }
  seleccionarFoto(evento: Event): void {
    const archivo = (evento.target as HTMLInputElement).files?.[0];
    if (!archivo) return;
    this.archivo = archivo;
    this.fotoPreview = URL.createObjectURL(archivo);
  }
  guardar(): void {
    const id = this.auth.usuario()?.id;
    if (!id || this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    this.guardando = true;
    const actualizar = (fotoPerfil: string) =>
      this.perfilService
        .actualizar({ id, ...this.formulario.getRawValue(), fotoPerfil })
        .subscribe({
          next: () => {
            this.guardando = false;
            this.router.navigate(['/perfil']);
          },
          error: (e) => {
            this.guardando = false;
            this.esError = true;
            this.mensaje = e.error?.message || 'No se pudo actualizar el perfil.';
          },
        });
    if (this.archivo)
      this.perfilService.subirImagen(this.archivo, 'perfiles').subscribe({
        next: (r) => actualizar(r.url),
        error: () => {
          this.guardando = false;
          this.esError = true;
          this.mensaje = 'No se pudo subir la fotografía.';
        },
      });
    else actualizar(this.formulario.getRawValue().fotoPerfil);
  }

  /** Mantiene carrera habilitada para ambos tipos y semestre únicamente para estudiantes. */
  private aplicarTipoUsuario(tipo: string, limpiar = true): void {
    const carrera = this.formulario.controls.carrera;
    const semestre = this.formulario.controls.semestre;
    if (limpiar) {
      carrera.reset('', { emitEvent: false });
      semestre.reset('', { emitEvent: false });
    }

    if (!tipo) {
      carrera.disable({ emitEvent: false });
      semestre.disable({ emitEvent: false });
      return;
    }

    carrera.enable({ emitEvent: false });
    if (tipo === 'Estudiante') {
      semestre.enable({ emitEvent: false });
    } else {
      semestre.setValue('No aplica', { emitEvent: false });
      semestre.disable({ emitEvent: false });
    }
  }

  abrirEliminar(): void {
    this.mensaje = '';
    this.mostrarConfirmacionEliminar = true;
  }

  cerrarEliminar(): void {
    if (!this.eliminando) this.mostrarConfirmacionEliminar = false;
  }

  /** Elimina la cuenta solo después de aceptar el aviso mostrado en el modal. */
  eliminarPerfil(): void {
    const usuario: any = this.auth.usuario();
    const id = Number(usuario?.id ?? usuario?.usuarioId ?? 0);
    if (!id || this.eliminando) return;
    this.eliminando = true;
    this.perfilService.eliminar(id).subscribe({
      next: () => this.auth.cerrarSesion(),
      error: (error) => {
        this.eliminando = false;
        this.esError = true;
        this.mensaje = error.error?.message || 'No se pudo eliminar la cuenta.';
      },
    });
  }
}
