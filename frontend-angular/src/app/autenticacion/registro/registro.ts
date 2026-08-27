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
import { MatSelectModule } from '@angular/material/select';
import { CARRERAS, SEMESTRES, TIPOS_USUARIO } from '../../core/opciones-perfil';
import { AutenticacionService } from '../autenticacion-service';

@Component({
  selector: 'app-registro',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
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
  readonly tiposUsuario = TIPOS_USUARIO;
  readonly carreras = CARRERAS;
  readonly semestres = SEMESTRES;

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
    tipoUsuario: ['', Validators.required],
    carrera: ['', Validators.required],
    semestre: ['', Validators.required],
    bio: [''],
    terminos: [false, Validators.requiredTrue],
    privacidad: [false],
  });
  readonly formularioCodigo = this.fb.nonNullable.group({
    codigo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  constructor(
    private autenticacionService: AutenticacionService,
    private router: Router,
  ) {
    this.formulario.controls.carrera.disable({ emitEvent: false });
    this.formulario.controls.semestre.disable({ emitEvent: false });
    this.formulario.controls.tipoUsuario.valueChanges.subscribe((tipo) =>
      this.aplicarTipoUsuario(tipo),
    );
  }

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
      viveEn: valores.viveEn.trim(),
      lugarOrigen: valores.lugarOrigen.trim(),
      fechaNacimiento: valores.fechaNacimiento,
      estadoCivil: valores.estadoCivil.trim(),
      tipoUsuario: valores.tipoUsuario,
      carrera: valores.carrera.trim(),
      semestre: valores.semestre.trim(),
      bio: valores.bio.trim(),
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
        next: () =>
          this.router.navigate(['/iniciarSesion'], { queryParams: { registro: 'ok' } }),
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

  /** Activa los campos académicos según el tipo de miembro seleccionado. */
  private aplicarTipoUsuario(tipo: string): void {
    const carrera = this.formulario.controls.carrera;
    const semestre = this.formulario.controls.semestre;
    carrera.reset('', { emitEvent: false });
    semestre.reset('', { emitEvent: false });

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

  private mostrar(mensaje: string, error: boolean): void {
    this.mensaje = mensaje;
    this.esError = error;
  }
}
