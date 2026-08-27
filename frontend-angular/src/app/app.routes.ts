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
import { DetalleEmpleo } from './empleos/detalle-empleo/detalle-empleo';
import { ListarPlataformas } from './plataformas/listar-plataformas/listar-plataformas';
import { PaginaNoEncontrada } from './pagina-no-encontrada/pagina-no-encontrada';
import { SeccionesPerfil } from './perfil/secciones-perfil/secciones-perfil';
import { Reportes } from './admin/reportes/reportes';

// Mapa central de navegación de ISTLC Zone.
export const routes: Routes = [
  { path: '', redirectTo: 'iniciarSesion', pathMatch: 'full' },

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
  { path: 'detalleEmpleo', component: DetalleEmpleo, canActivate: [autenticacionGuard] },
  { path: 'plataformas', component: ListarPlataformas, canActivate: [autenticacionGuard] },
  {
    path: 'informacion',
    component: SeccionesPerfil,
    canActivate: [autenticacionGuard],
    data: { seccion: 'informacion' },
  },
  {
    path: 'fotos',
    component: SeccionesPerfil,
    canActivate: [autenticacionGuard],
    data: { seccion: 'fotos' },
  },
  {
    path: 'cumpleanos',
    component: SeccionesPerfil,
    canActivate: [autenticacionGuard],
    data: { seccion: 'cumpleanos' },
  },
  {
    path: 'actividad',
    component: SeccionesPerfil,
    canActivate: [autenticacionGuard],
    data: { seccion: 'actividad' },
  },
  { path: 'adminReportes', component: Reportes, canActivate: [autenticacionGuard] },

  // Ruta de respaldo para direcciones inexistentes.
  { path: 'paginaNoEncontrada', component: PaginaNoEncontrada },
  { path: '**', redirectTo: 'paginaNoEncontrada' },
];
