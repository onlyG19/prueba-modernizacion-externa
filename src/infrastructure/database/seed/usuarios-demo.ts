import { Rut } from '../../../modules/usuarios/domain/rut';

/** Nombres frecuentes en Chile (Registro Civil), mujeres y hombres. */
const NOMBRES = [
  'Sofía',
  'Martina',
  'Florencia',
  'Isidora',
  'Agustina',
  'Josefa',
  'Emilia',
  'Antonella',
  'Catalina',
  'Valentina',
  'Javiera',
  'Constanza',
  'Camila',
  'Francisca',
  'Fernanda',
  'Daniela',
  'Carolina',
  'Paula',
  'María José',
  'Ignacia',
  'Benjamín',
  'Vicente',
  'Martín',
  'Matías',
  'Joaquín',
  'Agustín',
  'Tomás',
  'Cristóbal',
  'Maximiliano',
  'Sebastián',
  'Felipe',
  'Diego',
  'Nicolás',
  'Gabriel',
  'José Tomás',
  'Lucas',
  'Alonso',
  'Francisco',
  'Ignacio',
  'Rodrigo',
];

/** Apellidos frecuentes en Chile. */
const APELLIDOS = [
  'González',
  'Muñoz',
  'Rojas',
  'Díaz',
  'Pérez',
  'Soto',
  'Contreras',
  'Silva',
  'Martínez',
  'Sepúlveda',
  'Morales',
  'Rodríguez',
  'López',
  'Fuentes',
  'Hernández',
  'Torres',
  'Araya',
  'Flores',
  'Espinoza',
  'Valenzuela',
  'Castillo',
  'Tapia',
  'Reyes',
  'Gutiérrez',
  'Castro',
  'Pizarro',
  'Álvarez',
  'Vásquez',
  'Sánchez',
  'Fernández',
  'Ramírez',
  'Carrasco',
  'Gómez',
  'Cortés',
  'Herrera',
  'Núñez',
  'Jara',
  'Vergara',
  'Rivera',
  'Figueroa',
];

/** Rango realista de RUT de personas: del 5 al 27 millones. */
const RUT_MINIMO = 5_000_000;
const RUT_MAXIMO = 27_000_000;
const UN_ANIO_MS = 365 * 24 * 60 * 60 * 1000;

/** Semilla por defecto: con ella, cada corrida genera los mismos usuarios. */
export const SEMILLA_DEMO = 2026;
export const CANTIDAD_POR_DEFECTO = 50;
export const CANTIDAD_MAXIMA = 1000;

export interface UsuarioDemo {
  nombre: string;
  /** En forma canónica, como la guarda la API: `12345678-5`. */
  rut: string;
  creadoEn: Date;
}

/**
 * Generador pseudoaleatorio con semilla (mulberry32): números en [0, 1),
 * siempre la misma secuencia para la misma semilla.
 */
export function crearAleatorio(semilla: number): () => number {
  let estado = semilla >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Usuarios de demostración con nombres chilenos y RUT válidos (dígito
 * verificador calculado con la misma regla que valida la API).
 *
 * @remarks Determinista: con la misma semilla salen los mismos RUT, así que
 * sembrar dos veces no duplica (el RUT es único en la base). Las fechas de
 * registro se reparten en el año previo a `hasta`, para que ordenar por
 * "más recientes" muestre algo.
 */
export function generarUsuariosDemo(
  cantidad: number,
  { semilla = SEMILLA_DEMO, hasta = new Date() } = {},
): UsuarioDemo[] {
  const aleatorio = crearAleatorio(semilla);
  const elegir = <T>(lista: readonly T[]): T =>
    lista[Math.floor(aleatorio() * lista.length)];
  const ruts = new Set<string>();
  const usuarios: UsuarioDemo[] = [];

  while (usuarios.length < cantidad) {
    const cuerpo = String(
      RUT_MINIMO + Math.floor(aleatorio() * (RUT_MAXIMO - RUT_MINIMO)),
    );
    const rut = `${cuerpo}-${Rut.calcularDv(cuerpo)}`;
    if (ruts.has(rut)) {
      continue;
    }
    ruts.add(rut);

    const primerApellido = elegir(APELLIDOS);
    let segundoApellido = elegir(APELLIDOS);
    while (segundoApellido === primerApellido) {
      segundoApellido = elegir(APELLIDOS);
    }
    usuarios.push({
      nombre: `${elegir(NOMBRES)} ${primerApellido} ${segundoApellido}`,
      rut,
      creadoEn: new Date(
        hasta.getTime() - Math.floor(aleatorio() * UN_ANIO_MS),
      ),
    });
  }
  return usuarios;
}

/** Opciones del seed desde la línea de comandos. */
export interface OpcionesSeed {
  cantidad: number;
  /** Permite sembrar con NODE_ENV=production (p. ej. el stack Docker de demo). */
  forzar: boolean;
}

/**
 * Lee `--cantidad=N` (1 a 1000; por defecto 50) y `--forzar`.
 *
 * @throws Error si la cantidad no es un entero en el rango.
 */
export function leerOpcionesSeed(argumentos: readonly string[]): OpcionesSeed {
  const valor = argumentos
    .find((a) => a.startsWith('--cantidad='))
    ?.slice('--cantidad='.length);
  const cantidad = valor === undefined ? CANTIDAD_POR_DEFECTO : Number(valor);
  if (
    !Number.isInteger(cantidad) ||
    cantidad < 1 ||
    cantidad > CANTIDAD_MAXIMA
  ) {
    throw new Error(
      `--cantidad debe ser un entero entre 1 y ${CANTIDAD_MAXIMA} (recibido: ${valor})`,
    );
  }
  return { cantidad, forzar: argumentos.includes('--forzar') };
}
