import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { violacionesDeAccesibilidad } from '../test/accesibilidad';
// [ANTES] import { crearApiFalsa, type EstadoApiFalsa } from '../test/api-falsa';
import { crearApiFalsa, type EscenarioApiFalsa } from '../test/api-falsa';
import { RUTAS } from '../rutas/rutas';
import { renderizarConSesion } from '../test/renderizar';
import { servidor } from '../test/servidor';

// [ANTES] function prepararApi(inicial?: Partial<EstadoApiFalsa>) {
function prepararApi(inicial?: EscenarioApiFalsa) {
  const api = crearApiFalsa(inicial);
  servidor.use(...api.handlers);
  return api;
}

/** Espera a que la lista termine de cargar y devuelve sus filas. */
async function filas() {
  const tabla = await screen.findByRole('table');
  return within(tabla).getAllByRole('row').slice(1);
}

/**
 * Las filas que se ven ahora mismo. Tras buscar o paginar la tabla anterior
 * sigue a la vista hasta que responde el servidor: se usa dentro de `waitFor`.
 */
function filasVisibles() {
  return within(screen.getByRole('table')).getAllByRole('row').slice(1);
}

/** La ventana de detalle abierta (falla si no hay una). */
const ventana = () => screen.getByRole('dialog');

/** 25 usuarios: más de una página (20 por página). */
const VEINTICINCO_USUARIOS = Array.from({ length: 25 }, (_, i) => ({
  // [ANTES] id: i + 1,
  id: `u${i + 1}`,
  nombre: `Persona ${String(i + 1).padStart(2, '0')}`,
  rut: `${10_000_000 + i}-0`,
}));

describe('Encabezado de la consola', () => {
  it('debe mostrar el logo, el usuario y el total de visitas', async () => {
    prepararApi({ visitas: 41 });
    renderizarConSesion();

    expect(await screen.findByText('42 visitas al logo')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Uno' })).toHaveAttribute(
      'src',
      expect.stringMatching(/^data:image\/svg\+xml;base64,/),
    );
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  it('debe indicar que las visitas no están disponibles si Redis está caído', async () => {
    prepararApi({ redisDisponible: false });
    renderizarConSesion();

    expect(
      await screen.findByText('Visitas no disponibles'),
    ).toBeInTheDocument();
  });

  it('debe volver al login al cerrar sesión', async () => {
    prepararApi();
    const { usuario } = renderizarConSesion();

    await usuario.click(
      await screen.findByRole('button', { name: 'Cerrar sesión' }),
    );

    expect(
      screen.getByRole('heading', { name: 'Consola de usuarios' }),
    ).toBeInTheDocument();
    expect(sessionStorage.length).toBe(0);
    expect(window.location.pathname).toBe(RUTAS.ingresar);
    expect(
      screen.getByText('Cerraste sesión. Vuelve cuando quieras.'),
    ).toBeInTheDocument();
  });
});

describe('Lista de usuarios', () => {
  it('debe listar los usuarios ordenados por nombre, con el RUT formateado', async () => {
    prepararApi({
      usuarios: [
        // [ANTES] { id: 1, nombre: 'Zoe Díaz', rut: '11111111-1' },
        { id: 'u1', nombre: 'Zoe Díaz', rut: '11111111-1' },
        // [ANTES] { id: 2, nombre: 'Ana Rojas', rut: '12345678-5' },
        { id: 'u2', nombre: 'Ana Rojas', rut: '12345678-5' },
      ],
    });
    renderizarConSesion();

    const [primera, segunda] = await filas();
    expect(primera).toHaveTextContent('Ana Rojas');
    expect(primera).toHaveTextContent('12.345.678-5');
    expect(segunda).toHaveTextContent('Zoe Díaz');
    expect(screen.getByText('2 usuarios')).toBeInTheDocument();
  });

  it('debe buscar por nombre sin importar las tildes, y por RUT con o sin puntos', async () => {
    prepararApi();
    const { usuario } = renderizarConSesion();
    await filas();
    const buscador = screen.getByLabelText('Buscar por nombre o RUT');

    await usuario.type(buscador, 'perez');
    // [ANTES] expect(await filas()).toHaveLength(1);
    // [ANTES] expect(screen.getByText('1 de 2 usuarios')).toBeInTheDocument();
    expect(await screen.findByText('1 usuario encontrado')).toBeInTheDocument();
    expect(filasVisibles()).toHaveLength(1);

    await usuario.clear(buscador);
    await usuario.type(buscador, '9.876.543');
    // [ANTES] const [fila] = await filas();
    // [ANTES] expect(fila).toHaveTextContent('María López');
    await waitFor(() =>
      expect(filasVisibles()[0]).toHaveTextContent('María López'),
    );
    expect(filasVisibles()).toHaveLength(1);

    await usuario.clear(buscador);
    await usuario.type(buscador, 'nadie');
    expect(
      await screen.findByText('Ningún usuario coincide con «nadie».'),
    ).toBeInTheDocument();
  });

  it('debe conservar la búsqueda en la URL y retomarla al recargar', async () => {
    prepararApi();
    // [ANTES] window.history.replaceState(null, '', '/?buscar=maria');
    // [ANTES] const { usuario } = renderizarConSesion();
    const { usuario } = renderizarConSesion(`${RUTAS.usuarios}?buscar=maria`);

    const [fila] = await filas();
    expect(fila).toHaveTextContent('María López');
    const buscador = screen.getByLabelText('Buscar por nombre o RUT');
    expect(buscador).toHaveValue('maria');

    await usuario.clear(buscador);
    await usuario.type(buscador, 'juan');
    expect(window.location.search).toBe('?buscar=juan');
  });

  it('debe paginar de a 20, recordar la página en la URL y volver a la primera al buscar', async () => {
    prepararApi({ usuarios: VEINTICINCO_USUARIOS });
    const { usuario } = renderizarConSesion();

    expect(await filas()).toHaveLength(20);
    expect(screen.getByText('25 usuarios')).toBeInTheDocument();
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );

    const siguiente = screen.getByRole('button', { name: 'Siguiente' });
    await usuario.click(siguiente);

    await waitFor(() => expect(filasVisibles()).toHaveLength(5));
    expect(filasVisibles()[0]).toHaveTextContent('Persona 21');
    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument();
    expect(window.location.search).toBe('?pagina=2');
    // En la última página el botón queda inactivo, pero no pierde el foco.
    expect(siguiente).toHaveAttribute('aria-disabled', 'true');
    expect(siguiente).toHaveFocus();
    expect(await violacionesDeAccesibilidad()).toEqual([]);

    await usuario.type(
      screen.getByLabelText('Buscar por nombre o RUT'),
      'Persona 2',
    );
    expect(
      await screen.findByText('6 usuarios encontrados'),
    ).toBeInTheDocument();
    expect(window.location.search).toBe('?buscar=Persona+2');
  });

  it('debe ordenar por fecha de registro y recordar el orden en la URL', async () => {
    prepararApi({
      usuarios: [
        {
          // [ANTES] id: 1,
          id: 'u1',
          nombre: 'Ana Rojas',
          rut: '11111111-1',
          creadoEn: '2026-11-01T10:00:00.000Z',
        },
        {
          // [ANTES] id: 2,
          id: 'u2',
          nombre: 'Zoe Díaz',
          rut: '22222222-2',
          creadoEn: '2026-11-09T10:00:00.000Z',
        },
      ],
    });
    const { usuario } = renderizarConSesion();
    expect((await filas())[0]).toHaveTextContent('Ana Rojas');

    await usuario.selectOptions(
      screen.getByLabelText('Ordenar por'),
      'Más recientes',
    );

    await waitFor(() =>
      expect(filasVisibles()[0]).toHaveTextContent('Zoe Díaz'),
    );
    expect(window.location.search).toBe('?orden=-creadoEn');
  });

  it('debe corregir una página fuera de rango que venga en la URL', async () => {
    prepararApi();
    // [ANTES] window.history.replaceState(null, '', '/?pagina=7');
    // [ANTES] renderizarConSesion();
    renderizarConSesion(`${RUTAS.usuarios}?pagina=7`);

    expect(await filas()).toHaveLength(2);
    expect(window.location.search).toBe('');
  });

  it('debe invitar a registrar el primero cuando no hay usuarios', async () => {
    prepararApi({ usuarios: [] });
    // [ANTES] renderizarConSesion();
    const { usuario } = renderizarConSesion();

    expect(
      await screen.findByText(/Todavía no hay usuarios registrados/),
    ).toBeInTheDocument();
    // El formulario está en la otra pestaña: el enlace lleva a él.
    await usuario.click(
      screen.getByRole('link', { name: 'Registra el primero' }),
    );
    expect(window.location.pathname).toBe(RUTAS.registrarUsuario);
    expect(
      screen.getByRole('heading', { name: 'Registrar usuario' }),
    ).toBeInTheDocument();
  });

  it('debe permitir reintentar si la lista no carga', async () => {
    // [ANTES] const api = prepararApi();
    prepararApi();
    let fallar = true;
    servidor.use(
      // [ANTES] http.get('/api/usuarios', () =>
      // [ANTES]   fallar
      // [ANTES]     ? HttpResponse.json({ statusCode: 500 }, { status: 500 })
      // [ANTES]     : HttpResponse.json(api.estado.usuarios),
      // [ANTES] ),
      // Sin respuesta (undefined), MSW pasa la petición a la API falsa.
      // [ANTES] http.get('/api/usuarios', () =>
      http.get('/api/v1/usuarios', () =>
        fallar
          ? HttpResponse.json({ statusCode: 500 }, { status: 500 })
          : undefined,
      ),
    );
    const { usuario } = renderizarConSesion();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo cargar el registro de usuarios.',
    );
    fallar = false;
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await filas()).toHaveLength(2);
  });

  it('debe volver al login con un aviso si el token expiró', async () => {
    // MSW usa el primer handler que coincide: la sobrescritura va primero.
    servidor.use(
      // [ANTES] http.get('/api/usuarios', () =>
      http.get('/api/v1/usuarios', () =>
        HttpResponse.json({ statusCode: 401 }, { status: 401 }),
      ),
      ...crearApiFalsa().handlers,
    );
    renderizarConSesion();

    expect(
      await screen.findByText(
        'Tu sesión expiró. Ingresa de nuevo para continuar.',
      ),
    ).toBeInTheDocument();
    // El login recuerda la página: al volver a ingresar se retoma ahí.
    expect(window.location.pathname).toBe(RUTAS.ingresar);
    expect(new URLSearchParams(window.location.search).get('volver')).toBe(
      RUTAS.usuarios,
    );
  });
});

describe('Registrar usuario', () => {
  // [ANTES] it('debe registrar un usuario, mostrarlo en la lista y dejar el formulario listo para otro', async () => {
  it('debe registrar un usuario, dejar el formulario listo para otro y llevar a verlo en la tabla', async () => {
    const api = prepararApi();
    // [ANTES] const { usuario } = renderizarConSesion();
    // [ANTES] await filas();
    const { usuario } = renderizarConSesion(RUTAS.registrarUsuario);

    // [ANTES] await usuario.type(screen.getByLabelText('Nombre'), 'Ana Rojas');
    await usuario.type(await screen.findByLabelText('Nombre'), 'Ana Rojas');
    await usuario.type(screen.getByLabelText('RUT'), '111111111');
    await usuario.click(
      screen.getByRole('button', { name: 'Registrar usuario' }),
    );

    expect(
      await screen.findByText('Usuario registrado: Ana Rojas.'),
    ).toBeInTheDocument();
    // [ANTES] expect(await filas()).toHaveLength(3);
    // [ANTES] await waitFor(() => expect(filasVisibles()).toHaveLength(3));
    // Se envía el RUT en forma canónica, sin puntos.
    expect(api.estado.recibidos.creaciones).toEqual([
      { nombre: 'Ana Rojas', rut: '11111111-1' },
    ]);
    expect(screen.getByLabelText('Nombre')).toHaveValue('');
    expect(screen.getByLabelText('Nombre')).toHaveFocus();

    // La tabla se abre filtrada por su RUT: el recién registrado queda a la vista.
    await usuario.click(
      screen.getByRole('link', { name: 'Verlo en la tabla' }),
    );
    await waitFor(() => expect(filasVisibles()).toHaveLength(1));
    expect(filasVisibles()[0]).toHaveTextContent('Ana Rojas');
    expect(screen.getByLabelText('Buscar por nombre o RUT')).toHaveValue(
      '11.111.111-1',
    );
  });

  it('debe explicar el dígito verificador esperado sin llamar a la API', async () => {
    const api = prepararApi();
    // [ANTES] const { usuario } = renderizarConSesion();
    // [ANTES] await filas();
    const { usuario } = renderizarConSesion(RUTAS.registrarUsuario);
    await screen.findByLabelText('Nombre');

    await usuario.type(screen.getByLabelText('Nombre'), 'Ana Rojas');
    await usuario.type(screen.getByLabelText('RUT'), '123456789');
    await usuario.click(
      screen.getByRole('button', { name: 'Registrar usuario' }),
    );

    expect(
      screen.getByText(
        'El dígito verificador no corresponde: para este número debería ser 5.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('RUT')).toHaveFocus();
    expect(api.estado.recibidos.creaciones).toEqual([]);
  });

  it('debe pedir los campos obligatorios y llevar el foco al primero', async () => {
    prepararApi();
    // [ANTES] const { usuario } = renderizarConSesion();
    // [ANTES] await filas();
    const { usuario } = renderizarConSesion(RUTAS.registrarUsuario);
    await screen.findByLabelText('Nombre');

    await usuario.click(
      screen.getByRole('button', { name: 'Registrar usuario' }),
    );

    expect(
      screen.getByText('Escribe el nombre del usuario.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Escribe el RUT del usuario.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toHaveFocus();
  });

  it('debe mostrar el conflicto en el campo RUT si ya existe (409)', async () => {
    prepararApi();
    // [ANTES] const { usuario } = renderizarConSesion();
    // [ANTES] await filas();
    const { usuario } = renderizarConSesion(RUTAS.registrarUsuario);
    await screen.findByLabelText('Nombre');

    await usuario.type(screen.getByLabelText('Nombre'), 'Otro Juan');
    await usuario.type(screen.getByLabelText('RUT'), '12.345.678-5');
    await usuario.click(
      screen.getByRole('button', { name: 'Registrar usuario' }),
    );

    expect(
      await screen.findByText(
        /^Ya existe un usuario con el RUT 12\.345\.678-5\. Revisa el número/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('RUT')).toHaveFocus();
  });
});

describe('Cambios sin guardar', () => {
  it('debe pedir confirmación al salir de la página solo si hay datos escritos', async () => {
    prepararApi();
    // [ANTES] const { usuario } = renderizarConSesion();
    // [ANTES] await filas();
    const { usuario } = renderizarConSesion(RUTAS.registrarUsuario);
    await screen.findByLabelText('Nombre');
    const intentarSalir = () => {
      const evento = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(evento);
      return evento.defaultPrevented;
    };

    expect(intentarSalir()).toBe(false);
    await usuario.type(screen.getByLabelText('Nombre'), 'Ana');
    expect(intentarSalir()).toBe(true);
  });
});

describe('Detalle de un usuario', () => {
  it('debe abrir con el ojo una ventana con el detalle, marcando su fila', async () => {
    prepararApi({
      usuarios: [
        {
          id: 'u3',
          nombre: 'María López',
          rut: '9876543-3',
          creadoEn: '2026-11-10T12:00:00.000Z',
          actualizadoEn: '2026-11-10T15:30:00.000Z',
          version: 4,
        },
      ],
    });
    const { usuario } = renderizarConSesion();
    await filas();

    await usuario.click(
      screen.getByRole('button', { name: 'Ver detalle de María López' }),
    );

    const detalle = within(ventana());
    expect(ventana()).toHaveAccessibleName('María López');
    expect(detalle.getByText('9.876.543-3')).toBeInTheDocument();
    // Registrado el y último cambio: el mismo día, a distinta hora.
    expect(detalle.getAllByText(/10 de noviembre de 2026/)).toHaveLength(2);
    expect(detalle.getByText('4')).toBeInTheDocument();
    expect(detalle.getByText('u3')).toBeInTheDocument();
    // La fila de la persona abierta queda marcada tras la ventana.
    expect(filasVisibles()[0].className).toMatch(/seleccionada/);
  });

  it('debe pasar a editar con el lápiz, volver al detalle al cancelar y cerrar devolviendo el foco', async () => {
    const api = prepararApi();
    const { usuario } = renderizarConSesion();
    await filas();

    await usuario.click(
      screen.getByRole('button', { name: 'Ver detalle de Juan Pérez' }),
    );
    await usuario.click(
      within(ventana()).getByRole('button', { name: 'Editar' }),
    );
    expect(
      within(ventana()).getByRole('heading', { name: 'Editar usuario' }),
    ).toBeInTheDocument();
    expect(within(ventana()).getByLabelText('Nombre')).toHaveFocus();

    await usuario.click(
      within(ventana()).getByRole('button', { name: 'Cancelar' }),
    );
    expect(
      within(ventana()).queryByRole('heading', { name: 'Editar usuario' }),
    ).not.toBeInTheDocument();
    await waitFor(() =>
      expect(
        within(ventana()).getByRole('button', { name: 'Editar' }),
      ).toHaveFocus(),
    );

    await usuario.click(
      within(ventana()).getByRole('button', { name: 'Cerrar' }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Ver detalle de Juan Pérez' }),
      ).toHaveFocus(),
    );
    expect(api.estado.recibidos.cambios).toEqual([]);
  });

  it('debe avisar si otra persona eliminó al usuario (404)', async () => {
    const api = prepararApi();
    const { usuario } = renderizarConSesion();
    await filas();
    // Otra persona lo elimina después de que se cargó la tabla.
    api.estado.usuarios = api.estado.usuarios.filter(
      (u) => u.nombre !== 'María López',
    );

    await usuario.click(
      screen.getByRole('button', { name: 'Ver detalle de María López' }),
    );

    expect(await within(ventana()).findByRole('alert')).toHaveTextContent(
      'Este usuario ya no existe: otra persona lo eliminó.',
    );
    expect(
      within(ventana()).queryByRole('button', { name: 'Editar' }),
    ).not.toBeInTheDocument();
  });
});

describe('Editar usuario', () => {
  it('debe avisar si otra persona cambió al usuario mientras se editaba (412)', async () => {
    const api = prepararApi();
    const { usuario } = renderizarConSesion();
    await filas();

    await usuario.click(
      screen.getByRole('button', { name: 'Editar a Juan Pérez' }),
    );
    // Mientras tanto otra persona guarda un cambio: la versión sube a 2.
    const juan = api.estado.usuarios.find((u) => u.nombre === 'Juan Pérez');
    expect(juan).toBeDefined();
    Object.assign(juan ?? {}, { version: 2 });
    // [ANTES] const nombre = screen.getByLabelText('Nombre');
    const nombre = within(ventana()).getByLabelText('Nombre');
    await usuario.clear(nombre);
    await usuario.type(nombre, 'Juan Pablo Pérez');
    await usuario.click(
      screen.getByRole('button', { name: 'Guardar cambios' }),
    );

    expect(
      await screen.findByText(/Otra persona modificó a este usuario/),
    ).toBeInTheDocument();
    // El PATCH llevó If-Match con la versión 1: el cambio ajeno no se pisó.
    expect(juan?.nombre).toBe('Juan Pérez');
  });

  // [ANTES] it('debe guardar solo los campos que cambiaron', async () => {
  it('debe abrir con el lápiz directo la edición y guardar solo los campos que cambiaron', async () => {
    const api = prepararApi();
    const { usuario } = renderizarConSesion();
    await filas();

    await usuario.click(
      screen.getByRole('button', { name: 'Editar a Juan Pérez' }),
    );
    // [ANTES] const nombre = screen.getByLabelText('Nombre');
    const nombre = within(ventana()).getByLabelText('Nombre');
    expect(nombre).toHaveFocus();
    await usuario.clear(nombre);
    await usuario.type(nombre, 'Juan Pablo Pérez');
    await usuario.click(
      screen.getByRole('button', { name: 'Guardar cambios' }),
    );

    expect(
      await screen.findByText('Cambios guardados: Juan Pablo Pérez.'),
    ).toBeInTheDocument();
    expect(api.estado.recibidos.cambios).toEqual([
      { nombre: 'Juan Pablo Pérez' },
    ]);
    // [ANTES] expect(screen.getByRole('heading', { name: 'Registrar usuario' })).toBeInTheDocument();
    // La ventana vuelve al detalle, ya con los datos nuevos y la confirmación.
    expect(ventana()).toHaveAccessibleName('Juan Pablo Pérez');
    expect(
      within(ventana()).getByText(
        'Se guardaron los cambios de Juan Pablo Pérez.',
      ),
    ).toBeInTheDocument();
    expect(
      within(ventana()).getByRole('button', { name: 'Editar' }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(filasVisibles()[0]).toHaveTextContent('Juan Pablo Pérez'),
    );
  });

  // [ANTES] it('debe cancelar con Escape y devolver el foco al botón que abrió la edición', async () => {
  it('debe cerrar la ventana con Escape y devolver el foco al lápiz que la abrió', async () => {
    prepararApi();
    const { usuario } = renderizarConSesion();
    await filas();
    const editar = screen.getByRole('button', { name: 'Editar a Juan Pérez' });

    await usuario.click(editar);
    expect(
      screen.getByRole('heading', { name: 'Editar usuario' }),
    ).toBeInTheDocument();
    await usuario.keyboard('{Escape}');

    // [ANTES] expect(screen.getByRole('heading', { name: 'Registrar usuario' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Editar a Juan Pérez' }),
      ).toHaveFocus(),
    );
  });
});

describe('Eliminar usuario', () => {
  it('debe pedir confirmación, poder cancelar, y eliminar al confirmar', async () => {
    const api = prepararApi();
    const { usuario } = renderizarConSesion();
    await filas();

    await usuario.click(
      screen.getByRole('button', { name: 'Eliminar a María López' }),
    );
    expect(screen.getByText(/Esta acción no se puede deshacer/)).toBeVisible();
    // El foco cae en la opción segura.
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();

    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(api.estado.usuarios).toHaveLength(2);

    await usuario.click(
      screen.getByRole('button', { name: 'Eliminar a María López' }),
    );
    await usuario.click(
      screen.getByRole('button', { name: 'Eliminar usuario' }),
    );

    expect(
      await screen.findByText('Usuario eliminado: María López.'),
    ).toBeInTheDocument();
    // [ANTES] expect(await filas()).toHaveLength(1);
    await waitFor(() => expect(filasVisibles()).toHaveLength(1));
    expect(api.estado.usuarios.map((u) => u.nombre)).toEqual(['Juan Pérez']);
  });
});

describe('Accesibilidad de la consola', () => {
  it('no debe tener violaciones detectables con la lista cargada', async () => {
    prepararApi();
    renderizarConSesion();
    await filas();
    await screen.findByText('42 visitas al logo');

    expect(await violacionesDeAccesibilidad()).toEqual([]);
  });

  it('no debe tener violaciones detectables con la ventana de detalle abierta', async () => {
    prepararApi();
    const { usuario } = renderizarConSesion();
    await filas();
    await usuario.click(
      screen.getByRole('button', { name: 'Ver detalle de Juan Pérez' }),
    );

    expect(await violacionesDeAccesibilidad()).toEqual([]);
  });

  it('no debe tener violaciones detectables en el resumen ni en el registro', async () => {
    prepararApi();
    const { usuario } = renderizarConSesion(RUTAS.panel);
    await screen.findByText('Registrados recientemente');
    await screen.findByText('Juan Pérez', { selector: 'span' });
    expect(await violacionesDeAccesibilidad()).toEqual([]);

    await usuario.click(screen.getByRole('link', { name: 'Usuarios' }));
    await usuario.click(
      screen.getByRole('link', { name: 'Registrar usuario' }),
    );
    await screen.findByLabelText('Nombre');
    expect(await violacionesDeAccesibilidad()).toEqual([]);
  });
});
