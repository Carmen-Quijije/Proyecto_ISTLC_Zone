// Modelos compartidos que reproducen exactamente el contrato del backend original.
export interface Usuario {
  id: number;
  nombre: string;
  email?: string;
  usuario: string;
  privacidad?: boolean;
  emailVerificado?: boolean;
  viveEn?: string;
  lugarOrigen?: string;
  fechaNacimiento?: string;
  estadoCivil?: string;
  tipoUsuario?: string;
  carrera?: string;
  semestre?: string;
  fotoPerfil?: string;
  bio?: string;
  rol?: string;
  siguiendo?: boolean;
  solicitudPendiente?: boolean;
  ultimoMensaje?: string;
  ultimaFecha?: string;
  mensajesNoLeidos?: number;
  motivoSugerencia?: string;
}

export interface PerfilRespuesta {
  success: boolean;
  usuario: Usuario;
  seguidores: number;
  seguidos: number;
  siguiendo: boolean;
  solicitudPendiente: boolean;
}

export interface Publicacion {
  id: number;
  contenido: string;
  imagenUrl?: string;
  imagenes: string[];
  fecha: string;
  totalLikes: number;
  totalComentarios: number;
  likedByMe: boolean;
  autor: Pick<Usuario, 'id' | 'nombre' | 'usuario' | 'fotoPerfil'>;
}

export interface Comentario {
  id: number;
  contenido: string;
  fecha: string;
  comentarioPadreId?: number | null;
  autor: Pick<Usuario, 'id' | 'nombre' | 'usuario' | 'fotoPerfil'>;
  respuestaA?: { autor: { nombre: string } } | null;
}

export interface Mensaje {
  id?: number;
  contenido: string;
  fecha?: string;
  mio: boolean;
}

export interface Notificacion {
  id: number;
  tipo: string;
  mensaje: string;
  referencia_id?: number;
  referenciaId?: number;
  leida: boolean;
  fecha: string;
}

export interface SolicitudSeguimiento {
  id: number;
  usuario_id: number;
  nombre: string;
  usuario: string;
  foto_perfil?: string;
  fecha: string;
}
