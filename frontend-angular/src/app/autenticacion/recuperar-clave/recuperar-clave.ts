// Recuperación completa: solicita código y establece una contraseña nueva.
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
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
    MatIconModule,
  ],
  templateUrl: './recuperar-clave.html',
  styleUrl: './recuperar-clave.css',
})
export class RecuperarClave {
  private readonly fb = inject(FormBuilder);
  codigoEnviado = false;
  mensaje = '';
  esError = false;
  procesando = false;
  readonly solicitud = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });
  readonly cambio = this.fb.nonNullable.group({
    codigo: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmacion: ['', Validators.required],
  });
  constructor(
    private auth: AutenticacionService,
    private router: Router,
  ) {}
  enviar(): void {
    if (this.solicitud.invalid) return;
    this.procesando = true;
    this.auth.solicitarRecuperacion(this.solicitud.getRawValue().email).subscribe({
      next: (r: any) => {
        this.codigoEnviado = true;
        this.mostrar(r.message || 'Código enviado al correo.', false);
        this.procesando = false;
      },
      error: (e) => {
        this.mostrar(e.error?.message || 'No se pudo enviar el código.', true);
        this.procesando = false;
      },
    });
  }
  cambiar(): void {
    const d = this.cambio.getRawValue();
    if (this.cambio.invalid || d.password !== d.confirmacion) {
      this.mostrar('Las contraseñas no coinciden.', true);
      return;
    }
    this.procesando = true;
    this.auth.restablecerClave(this.solicitud.getRawValue().email, d.codigo, d.password).subscribe({
      next: () => this.router.navigate(['/iniciarSesion'], { queryParams: { recuperada: 'ok' } }),
      error: (e) => {
        this.mostrar(e.error?.message || 'No se pudo cambiar la contraseña.', true);
        this.procesando = false;
      },
    });
  }
  private mostrar(m: string, e: boolean): void {
    this.mensaje = m;
    this.esError = e;
  }
}
