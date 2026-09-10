//constants.ts

export type View = 'gerencia' | 'supervision' | 'agencia' | 'asesores' | 'colocaciones' | 'diaria';
export type Filters = { period: string; agency: string; advisor: string; day: string };

export const viewMeta: Record<View, { label: string; eyebrow: string; title: string; subtitle: string }> = {
  gerencia: {
    label: 'Reporte Gerencia',
    eyebrow: 'Lectura general de la operación',
    title: 'La colocación avanza con foco y control.',
    subtitle: 'Una lectura ejecutiva de metas, cartera, crecimiento, mora y productividad por agencia.',
  },
  supervision: {
    label: 'Supervisión Agencias',
    eyebrow: 'Supervisión · indicadores consolidados',
    title: 'Cada agencia muestra una oportunidad distinta.',
    subtitle: 'Compara el desempeño comercial y de recuperación para decidir dónde intervenir primero.',
  },
  agencia: {
    label: 'Detalle de Agencia',
    eyebrow: 'Supervisión · agencia seleccionada',
    title: 'Profundiza en la salud de una agencia.',
    subtitle: 'Revisa colocación, repagos, cartera y mora CPP por agencia y por asesor.',
  },
  asesores: {
    label: 'Indicadores Asesores',
    eyebrow: 'Seguimiento de equipos',
    title: 'La productividad se construye asesor por asesor.',
    subtitle: 'Identifica desempeño, duración, socios nuevos, mora y faltante a la meta de S/ 20K.',
  },
  colocaciones: {
    label: 'Colocaciones',
    eyebrow: 'Ritmo de colocación',
    title: 'El objetivo del mes se vuelve alcanzable.',
    subtitle: 'Monitorea meta, logrado y proyección para anticiparte al cierre de la agencia.',
  },
  diaria: {
    label: 'Productividad Diaria',
    eyebrow: 'Metas, proyecciones y colocaciones logradas',
    title: 'La gestión de hoy define el cierre.',
    subtitle: 'Compara cantidad y monto de colocaciones frente a la meta diaria de cada agencia.',
  },
};

export const catalogoAgencias = [
  { id: '01', nombre: 'Wanchaq' },
  { id: '02', nombre: 'San Jerónimo' },
  { id: '03', nombre: 'Quillabamba' },
  { id: '04', nombre: 'Sicuani' },
  { id: '05', nombre: 'Molino' },
  { id: '06', nombre: 'Juliaca' },
  { id: '07', nombre: 'Lima Los Olivos' },
  { id: '08', nombre: 'Tica Tica' },
  { id: '09', nombre: 'Magisterio' },
  { id: '10', nombre: 'Lima SJL' },
  { id: '11', nombre: 'Chiclayo' },
  { id: '12', nombre: 'Arequipa' },
  { id: '13', nombre: 'Pucallpa' }
];

export const nombresAgencias = ['Todas', ...catalogoAgencias.map(a => a.nombre)];