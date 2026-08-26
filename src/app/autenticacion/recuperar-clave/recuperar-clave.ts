// Pantalla para solicitar instrucciones de recuperación por correo.
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AutenticacionService } from '../autenticacion-service';

@Component({
  selector: 'app-recuperar-clave',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './recuperar-clave.html',
  styleUrl: './recuperar-clave.css',
})
export class RecuperarClave {
  // Mensaje mostrado después de procesar la solicitud.
  mensaje = '';

  // Formulario reactivo que exige un correo válido.
  formulario;

  constructor(
    private fb: FormBuilder,
    private autenticacionService: AutenticacionService,
  ) {
    this.formulario = this.fb.nonNullable.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }
  /** Solicita la recuperación si el formulario contiene un correo válido. */
  enviar(): void {
    if (this.formulario.invalid) return;
    this.autenticacionService.solicitarRecuperacion(this.formulario.getRawValue().email).subscribe({
      next: () => (this.mensaje = 'Solicitud enviada. Revisa tu correo.'),
      error: () => (this.mensaje = 'Si el correo está registrado, recibirás instrucciones.'),
    });
  }
}
