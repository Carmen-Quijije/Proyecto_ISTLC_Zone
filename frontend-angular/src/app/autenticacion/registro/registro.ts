// Registro en dos pasos: datos de la cuenta y verificación por correo.
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
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
    MatIconModule,
  ],
  templateUrl: './registro.html',
  styleUrl: './registro.css',
})
export class Registro {
  private readonly fb = inject(FormBuilder);
  pasoVerificacion = false;
  procesando = false;
  mensaje = '';
  esError = false;
  emailPendiente = '';

  readonly formulario = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    email: [
      '',
      [
        Validators.required,
        Validators.email,
        Validators.pattern(/@tecnologicoliceocristiano\.edu\.ec$/i),
      ],
    ],
    usuario: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(6)]],
    terminos: [false, Validators.requiredTrue],
  });
  readonly formularioCodigo = this.fb.nonNullable.group({
    codigo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  constructor(
    private autenticacionService: AutenticacionService,
    private router: Router,
  ) {}

  registrar(): void {
    if (this.formulario.invalid) return;
    const { terminos, ...datos } = this.formulario.getRawValue();
    this.procesando = true;
    this.autenticacionService.registrar({ ...datos, privacidad: terminos }).subscribe({
      next: (respuesta: any) => {
        this.emailPendiente = datos.email;
        this.pasoVerificacion = true;
        this.mostrar(respuesta.message || 'Revisa tu correo e ingresa el código.', false);
        this.procesando = false;
      },
      error: (error) => {
        this.mostrar(error.error?.message || 'No fue posible completar el registro.', true);
        this.procesando = false;
      },
    });
  }

  confirmarCodigo(): void {
    if (this.formularioCodigo.invalid) return;
    this.procesando = true;
    this.autenticacionService
      .verificarCorreo(this.emailPendiente, this.formularioCodigo.getRawValue().codigo)
      .subscribe({
        next: () => this.router.navigate(['/iniciarSesion'], { queryParams: { registro: 'ok' } }),
        error: (error) => {
          this.mostrar(error.error?.message || 'Código inválido o expirado.', true);
          this.procesando = false;
        },
      });
  }

  reenviar(): void {
    this.autenticacionService.reenviarCodigo(this.emailPendiente).subscribe({
      next: (respuesta: any) => this.mostrar(respuesta.message || 'Código reenviado.', false),
      error: (error) =>
        this.mostrar(error.error?.message || 'No se pudo reenviar el código.', true),
    });
  }

  private mostrar(mensaje: string, error: boolean): void {
    this.mensaje = mensaje;
    this.esError = error;
  }
}
