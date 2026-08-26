// Formulario que permite modificar la información del perfil autenticado.
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AutenticacionService } from '../../autenticacion/autenticacion-service';
import { PerfilService } from '../perfil-service';

@Component({
  selector: 'app-editar-perfil',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './editar-perfil.html',
  styleUrl: './editar-perfil.css',
})
export class EditarPerfil {
  // Mensaje de confirmación y formulario reactivo de edición.
  mensaje = '';
  formulario;

  // Inicializa el formulario con el nombre disponible en la sesión.
  constructor(
    private fb: FormBuilder,
    private perfilService: PerfilService,
    private autenticacionService: AutenticacionService,
  ) {
    this.formulario = this.fb.nonNullable.group({
      nombre: [this.autenticacionService.usuario()?.nombre ?? ''],
      biografia: [''],
      vive_en: [''],
      carrera: [''],
      semestre: [''],
    });
  }
  /** Combina el identificador de sesión con los campos y actualiza el perfil. */
  guardar(): void {
    this.perfilService
      .actualizar({ id: this.autenticacionService.usuario()?.id, ...this.formulario.getRawValue() })
      .subscribe(() => (this.mensaje = 'Perfil actualizado correctamente.'));
  }
}
