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
  mensaje = '';
  codigoEnviado = false;
  claveActualizada = false;

  // Formulario reactivo que exige un correo válido.
  formulario;

  constructor(
    private fb: FormBuilder,
    private autenticacionService: AutenticacionService,
  ) {
    this.formulario = this.fb.nonNullable.group({
      email: ['', [Validators.required, Validators.email]],
      codigo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmarPassword: ['', Validators.required],
    });
  }
  /** Solicita la recuperación si el formulario contiene un correo válido. */
  enviar(): void {
    const email = this.formulario.controls.email;
    if (email.invalid) return;

    this.autenticacionService.solicitarRecuperacion(email.value).subscribe({
      next: () => {
        this.codigoEnviado = true;
        this.mensaje = 'Revisa tu correo e ingresa el código de 6 dígitos.';
      },
      error: (error) => (this.mensaje = error.error?.message ?? 'No se pudo enviar el código.'),
    });
  }

  /** Verifica el código enviado y actualiza la contraseña. */
  restablecer(): void {
    const { email, codigo, password, confirmarPassword } = this.formulario.getRawValue();
    if (!codigo || !password || password !== confirmarPassword || this.formulario.controls.codigo.invalid || this.formulario.controls.password.invalid) {
      this.mensaje = 'Revisa el código y confirma una contraseña de al menos 6 caracteres.';
      return;
    }

    this.autenticacionService.restablecerClave({ email, codigo, password }).subscribe({
      next: () => {
        this.claveActualizada = true;
        this.mensaje = 'Contraseña actualizada. Ya puedes iniciar sesión.';
      },
      error: (error) => (this.mensaje = error.error?.message ?? 'El código no es válido o ya expiró.'),
    });
  }
}
