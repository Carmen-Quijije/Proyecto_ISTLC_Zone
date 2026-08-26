// Servicio responsable de la sesión, el acceso y el registro de usuarios.
import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

// Estructura mínima del usuario almacenado durante la sesión.
export interface UsuarioSesion {
  id: number;
  nombre?: string;
  usuario?: string;
  email?: string;
  foto_perfil?: string;
  rol?: string;
}

@Injectable({ providedIn: 'root' })
export class AutenticacionService {
  // Dirección base del módulo de autenticación del backend Express.
  // Usa el mismo dominio en Render; durante desarrollo Angular redirige /api al puerto 3000.
  private readonly apiUrl = '/api/auth';

  // Signal privada que conserva la sesión recuperada desde localStorage.
  private readonly usuarioActual = signal<UsuarioSesion | null>(this.leerSesion());

  // Signals públicas de solo lectura utilizadas por componentes y guards.
  readonly usuario = computed(() => this.usuarioActual());
  readonly estaAutenticado = computed(() => this.usuarioActual() !== null);

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  /** Envía las credenciales y guarda el usuario cuando el backend las valida. */
  iniciarSesion(credenciales: { usuario: string; password: string }) {
    return this.http
      .post<{ usuario: UsuarioSesion }>(`${this.apiUrl}/login`, credenciales)
      .pipe(tap((respuesta) => this.guardarSesion(respuesta.usuario)));
  }

  /** Registra una cuenta nueva mediante el endpoint del backend. */
  registrar(datos: unknown) {
    return this.http.post(`${this.apiUrl}/register`, datos);
  }

  /** Solicita el envío de instrucciones para recuperar la contraseña. */
  solicitarRecuperacion(email: string) {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email });
  }

  /** Elimina la sesión local y devuelve al usuario a la pantalla de acceso. */
  cerrarSesion(): void {
    localStorage.removeItem('usuario');
    this.usuarioActual.set(null);
    this.router.navigate(['/iniciarSesion']);
  }

  /** Persiste la sesión y actualiza la signal utilizada por la interfaz. */
  private guardarSesion(usuario: UsuarioSesion): void {
    localStorage.setItem('usuario', JSON.stringify(usuario));
    this.usuarioActual.set(usuario);
  }

  /** Recupera la sesión almacenada; devuelve null si no existe o está dañada. */
  private leerSesion(): UsuarioSesion | null {
    try {
      return JSON.parse(localStorage.getItem('usuario') ?? 'null');
    } catch {
      return null;
    }
  }
}
