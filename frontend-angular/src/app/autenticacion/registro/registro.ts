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
import { PerfilService } from '../../perfil/perfil-service';
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
    usuario: [
      '',
      [Validators.required, Validators.pattern(/^[a-z0-9_-]{3,30}$/)],
    ],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmacion: ['', [Validators.required, Validators.minLength(8)]],
    viveEn: [''],
    lugarOrigen: [''],
    fechaNacimiento: [''],
    estadoCivil: [''],
    carrera: [''],
    semestre: [''],
    bio: [''],
    terminos: [false, Validators.requiredTrue],
    privacidad: [false],
  });
  readonly formularioCodigo = this.fb.nonNullable.group({
    codigo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  constructor(
    private autenticacionService: AutenticacionService,
    private perfilService: PerfilService,
    private router: Router,
  ) {}

  registrar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.mostrar('Revisa los campos obligatorios antes de continuar.', true);
      return;
    }

    const valores = this.formulario.getRawValue();
    if (valores.password !== valores.confirmacion) {
      this.mostrar('Las contraseñas no coinciden.', true);
      return;
    }

    const datos = {
      nombre: valores.nombre.trim(),
      email: valores.email.trim().toLowerCase(),
      usuario: valores.usuario.trim().toLowerCase(),
      password: valores.password,
      privacidad: valores.privacidad,
    };
    this.procesando = true;
    this.mensaje = '';
    this.autenticacionService.registrar(datos).subscribe({
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
    if (this.formularioCodigo.invalid) {
      this.formularioCodigo.markAllAsTouched();
      this.mostrar('Ingresa el código de seis dígitos enviado a tu correo.', true);
      return;
    }
    this.procesando = true;
    this.autenticacionService
      .verificarCorreo(this.emailPendiente, this.formularioCodigo.getRawValue().codigo)
      .subscribe({
        next: () => {
          this.mostrar('Correo confirmado correctamente. Guardando tu perfil...', false);
          this.completarPerfilRegistrado();
        },
        error: (error) => {
          this.mostrar(error.error?.message || 'Código inválido o expirado.', true);
          this.procesando = false;
        },
      });
  }

  reenviar(): void {
    if (!this.emailPendiente || this.procesando) return;
    this.procesando = true;
    this.autenticacionService.reenviarCodigo(this.emailPendiente).subscribe({
      next: (respuesta: any) => {
        this.mostrar(respuesta.message || 'Código reenviado.', false);
        this.procesando = false;
      },
      error: (error) => {
        this.mostrar(error.error?.message || 'No se pudo reenviar el código.', true);
        this.procesando = false;
      },
    });
  }

  /** Cierra el cuadro sin perder los datos escritos ni invalidar el código enviado. */
  cerrarVerificacion(): void {
    if (!this.procesando) {
      this.pasoVerificacion = false;
      this.formularioCodigo.reset({ codigo: '' });
      this.mensaje = '';
    }
  }

  /** Conserva las mismas reglas del usuario empleadas por la versión sin Angular. */
  normalizarUsuario(): void {
    const control = this.formulario.controls.usuario;
    const normalizado = control.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (normalizado !== control.value) control.setValue(normalizado, { emitEvent: false });
  }

  /** El código de verificación solo admite los seis números enviados por correo. */
  normalizarCodigo(): void {
    const control = this.formularioCodigo.controls.codigo;
    const normalizado = control.value.replace(/\D/g, '').slice(0, 6);
    if (normalizado !== control.value) control.setValue(normalizado, { emitEvent: false });
  }

  /** Guarda los datos opcionales mediante el endpoint de perfil que ya existe. */
  private completarPerfilRegistrado(): void {
    const valores = this.formulario.getRawValue();
    this.autenticacionService
      .iniciarSesion({ usuario: valores.usuario.trim().toLowerCase(), password: valores.password })
      .subscribe({
        next: (respuesta) => {
          const usuario = respuesta.usuario;
          this.perfilService
            .actualizar({
              id: usuario.id,
              nombre: valores.nombre.trim(),
              viveEn: valores.viveEn.trim(),
              lugarOrigen: valores.lugarOrigen.trim(),
              fechaNacimiento: valores.fechaNacimiento,
              estadoCivil: valores.estadoCivil.trim(),
              carrera: valores.carrera.trim(),
              semestre: valores.semestre.trim(),
              fotoPerfil: usuario.fotoPerfil || '',
              bio: valores.bio.trim(),
            })
            .subscribe({
              next: () => this.autenticacionService.cerrarSesion(),
              error: () => this.autenticacionService.cerrarSesion(),
            });
        },
        // La cuenta ya está verificada aunque la sesión temporal no pueda iniciarse.
        error: () =>
          this.router.navigate(['/iniciarSesion'], { queryParams: { registro: 'ok' } }),
      });
  }

  private mostrar(mensaje: string, error: boolean): void {
    this.mensaje = mensaje;
    this.esError = error;
  }
}
