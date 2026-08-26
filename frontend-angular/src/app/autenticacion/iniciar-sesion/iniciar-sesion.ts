// Pantalla de acceso: formulario de autenticación y carrusel institucional.
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AutenticacionService } from '../autenticacion-service';

@Component({
  selector: 'app-iniciar-sesion',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './iniciar-sesion.html',
  styleUrl: './iniciar-sesion.css',
})
export class IniciarSesion implements OnInit, OnDestroy {
  // Estado visual del formulario.
  mensajeError = '';
  procesando = false;

  // Estado y contenido del carrusel de bienvenida.
  // La señal notifica a Angular cada vez que el temporizador cambia la imagen.
  readonly imagenActual = signal(0);
  readonly imagenes = [
    { ruta: 'assets/images/principal1.jpg', texto: 'Conecta con tus compañeros' },
    { ruta: 'assets/images/principal2.jpg', texto: 'Comparte ideas y experiencias' },
    { ruta: 'assets/images/principal3.jpeg', texto: 'Forma parte de nuestra comunidad' },
  ];
  // Formulario reactivo y referencia del cambio automático de imágenes.
  formulario;
  private temporizador?: ReturnType<typeof setInterval>;

  // Construye el formulario e inyecta los servicios requeridos.
  constructor(
    private fb: FormBuilder,
    private autenticacionService: AutenticacionService,
    private router: Router,
  ) {
    this.formulario = this.fb.nonNullable.group({
      usuario: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  /** Inicia el cambio automático del carrusel cada 3,5 segundos. */
  ngOnInit(): void {
    this.temporizador = setInterval(() => this.siguienteImagen(), 3500);
  }

  /** Libera el temporizador cuando Angular destruye el componente. */
  ngOnDestroy(): void {
    if (this.temporizador) clearInterval(this.temporizador);
  }

  /** Avanza circularmente a la imagen siguiente. */
  siguienteImagen(): void {
    this.imagenActual.update((indice) => (indice + 1) % this.imagenes.length);
  }

  /** Retrocede circularmente a la imagen anterior. */
  imagenAnterior(): void {
    this.imagenActual.update(
      (indice) => (indice - 1 + this.imagenes.length) % this.imagenes.length,
    );
  }

  /** Permite seleccionar una imagen desde los indicadores inferiores. */
  seleccionarImagen(indice: number): void {
    this.imagenActual.set(indice);
  }

  /** Valida el formulario, llama al servicio y navega al muro al ingresar. */
  iniciarSesion(): void {
    if (this.formulario.invalid) return;
    this.procesando = true;
    this.autenticacionService.iniciarSesion(this.formulario.getRawValue()).subscribe({
      next: () => this.router.navigate(['/muro']),
      error: (error) => {
        this.mensajeError =
          error.error?.mensaje ?? 'Usuario o contraseña incorrecta, vuelve a intentar.';
        this.procesando = false;
      },
    });
  }
}
