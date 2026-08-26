// Formulario para crear una cuenta nueva en ISTLC Zone.
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AutenticacionService } from '../autenticacion-service';

@Component({
  selector: 'app-registro',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
  ],
  templateUrl: './registro.html',
  styleUrl: './registro.css',
})
export class Registro {
  // Mensajes que informan el resultado de la operación.
  mensaje = '';
  registroExitoso = false;

  // Formulario reactivo con reglas de validación.
  formulario;

  // Define los campos obligatorios y sus validadores.
  constructor(
    private fb: FormBuilder,
    private autenticacionService: AutenticacionService,
  ) {
    this.formulario = this.fb.nonNullable.group({
      nombre: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      usuario: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      terminos: [false, Validators.requiredTrue],
    });
  }
  /** Envía el formulario válido al servicio de autenticación. */
  registrar(): void {
    if (this.formulario.invalid) return;
    this.autenticacionService.registrar(this.formulario.getRawValue()).subscribe({
      next: () => {
        this.registroExitoso = true;
        this.mensaje = 'Registro enviado. Revisa tu correo para confirmar la cuenta.';
      },
      error: (error) =>
        (this.mensaje = error.error?.mensaje ?? 'No fue posible completar el registro.'),
    });
  }
}
