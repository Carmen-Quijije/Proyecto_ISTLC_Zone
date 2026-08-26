// Componentes utilizados por el enrutador de Angular.
import { Routes } from '@angular/router';
import { IniciarSesion } from './autenticacion/iniciar-sesion/iniciar-sesion';
import { Registro } from './autenticacion/registro/registro';
import { RecuperarClave } from './autenticacion/recuperar-clave/recuperar-clave';
import { TerminosCondiciones } from './autenticacion/terminos-condiciones/terminos-condiciones';
import { autenticacionGuard } from './autenticacion/autenticacion.guard';
import { ListarPublicaciones } from './muro/listar-publicaciones/listar-publicaciones';
import { VerPerfil } from './perfil/ver-perfil/ver-perfil';
import { EditarPerfil } from './perfil/editar-perfil/editar-perfil';
import { ListarAmigos } from './amigos/listar-amigos/listar-amigos';
import { ListarMensajes } from './mensajes/listar-mensajes/listar-mensajes';
import { ListarEmpleos } from './empleos/listar-empleos/listar-empleos';
import { ListarPlataformas } from './plataformas/listar-plataformas/listar-plataformas';
import { PaginaNoEncontrada } from './pagina-no-encontrada/pagina-no-encontrada';

// Mapa central de navegación de ISTLC Zone.
export const routes: Routes = [
  { path: '', redirectTo: 'iniciarSesion', pathMatch: 'full' },

  // Compatibilidad con los enlaces de la versión anterior en HTML.
  // Así, una URL guardada como /muro.html sigue funcionando sin recargar la SPA.
  { path: 'muro.html', redirectTo: 'muro', pathMatch: 'full' },
  { path: 'perfil.html', redirectTo: 'perfil', pathMatch: 'full' },
  { path: 'editarPerfil.html', redirectTo: 'editarPerfil', pathMatch: 'full' },
  { path: 'amigos.html', redirectTo: 'amigos', pathMatch: 'full' },
  { path: 'mensajes.html', redirectTo: 'mensajes', pathMatch: 'full' },
  { path: 'empleos.html', redirectTo: 'empleos', pathMatch: 'full' },
  { path: 'plataformas.html', redirectTo: 'plataformas', pathMatch: 'full' },
  { path: 'iniciarSesion.html', redirectTo: 'iniciarSesion', pathMatch: 'full' },
  { path: 'registro.html', redirectTo: 'registro', pathMatch: 'full' },
  { path: 'recuperarClave.html', redirectTo: 'recuperarClave', pathMatch: 'full' },
  { path: 'terminosCondiciones.html', redirectTo: 'terminosCondiciones', pathMatch: 'full' },

  // Autenticación: rutas públicas
  { path: 'iniciarSesion', component: IniciarSesion },
  { path: 'registro', component: Registro },
  { path: 'recuperarClave', component: RecuperarClave },
  { path: 'terminosCondiciones', component: TerminosCondiciones },

  // Comunidad: rutas protegidas
  { path: 'muro', component: ListarPublicaciones, canActivate: [autenticacionGuard] },
  { path: 'perfil', component: VerPerfil, canActivate: [autenticacionGuard] },
  { path: 'editarPerfil', component: EditarPerfil, canActivate: [autenticacionGuard] },
  { path: 'amigos', component: ListarAmigos, canActivate: [autenticacionGuard] },
  { path: 'mensajes', component: ListarMensajes, canActivate: [autenticacionGuard] },
  { path: 'empleos', component: ListarEmpleos, canActivate: [autenticacionGuard] },
  { path: 'plataformas', component: ListarPlataformas, canActivate: [autenticacionGuard] },

  // Ruta de respaldo para direcciones inexistentes.
  { path: 'paginaNoEncontrada', component: PaginaNoEncontrada },
  { path: '**', redirectTo: 'paginaNoEncontrada' },
];
