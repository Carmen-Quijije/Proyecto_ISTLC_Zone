// El tipo se guarda separado de la carrera para controlar los campos dependientes.
export const TIPOS_USUARIO = ['Estudiante', 'Docente'] as const;

// Carreras disponibles tanto para estudiantes como para docentes.
export const CARRERAS = [
  'Desarrollo de Software',
  'Acción Pastoral',
  'Pedagogía',
  'Administración',
  'Otros',
] as const;

// Solo se habilitan cuando el usuario selecciona el tipo Estudiante.
export const SEMESTRES = [
  '1 semestre',
  '2 semestre',
  '3 semestre',
  '4 semestre',
  '5 semestre',
] as const;
