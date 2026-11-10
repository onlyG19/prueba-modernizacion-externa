import { etiquetaUnica, rutAlAzar } from './apoyo/datos';
import { expect, test } from './apoyo/fixtures';
import { abrirPestana, registrarUsuario } from './apoyo/navegacion';

/** La tabla filtrada por la etiqueta de un test: solo se ven sus usuarios. */
const tablaFiltrada = (etiqueta: string) =>
  `/panel/usuarios?buscar=${etiqueta}`;

test('ciclo completo: registrar, ver, editar, buscar, recargar y eliminar', async ({
  page,
}) => {
  const etiqueta = etiquetaUnica();
  const nombre = `Ana Rojas ${etiqueta}`;
  const editado = `Ana María Rojas ${etiqueta}`;
  const rut = rutAlAzar();

  await page.goto('/panel');
  await abrirPestana(page, 'Registrar usuario');
  await registrarUsuario(page, nombre, rut.tecleado);
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: `Usuario registrado: ${nombre}.` }),
  ).toBeVisible();
  // El registro está en otra pestaña: el enlace abre la tabla filtrada por su RUT.
  await page.getByRole('link', { name: 'Verlo en la tabla' }).click();
  await expect(page.getByRole('row', { name: nombre })).toContainText(
    rut.formateado,
  );

  // El ojo abre el detalle en una ventana modal; el lápiz, dentro, la edición.
  await page.getByRole('button', { name: `Ver detalle de ${nombre}` }).click();
  const ventana = page.getByRole('dialog', { name: nombre });
  await expect(ventana).toContainText(rut.formateado);
  // Con `showModal()` el resto de la página queda inerte: Tab recorre la
  // ventana y nunca llega a la tabla de fondo. (Tras el último botón el foco
  // puede ir a la barra del navegador, y entonces `activeElement` es `body`.)
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    const enElFondo = await page.evaluate(
      () =>
        document.activeElement !== document.body &&
        document.activeElement?.closest('dialog') === null,
    );
    expect(enElFondo).toBe(false);
  }
  await ventana.getByRole('button', { name: 'Editar' }).click();
  await ventana.getByLabel('Nombre', { exact: true }).fill(editado);
  await ventana.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(
    page.getByText(`Se guardaron los cambios de ${editado}.`),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('row', { name: editado })).toBeVisible();

  // Búsqueda por parte del RUT, guardada en la URL.
  const busqueda = page.getByLabel('Buscar por nombre o RUT');
  const parteDelRut = rut.formateado.slice(0, 6);
  await busqueda.fill(parteDelRut);
  await expect(page).toHaveURL(
    (url) => url.searchParams.get('buscar') === parteDelRut,
  );

  // La sesión (sessionStorage), la búsqueda (URL) y los datos (Postgres) sobreviven.
  await page.reload();
  await expect(busqueda).toHaveValue(parteDelRut);
  await expect(page.getByRole('row', { name: editado })).toBeVisible();

  // La búsqueda la resuelve Postgres: sin tildes también encuentra (unaccent).
  await busqueda.fill(`ana maria rojas ${etiqueta}`);
  await expect(page.getByText('1 usuario encontrado')).toBeVisible();
  await expect(page.getByRole('row', { name: editado })).toBeVisible();

  await page.getByRole('button', { name: `Eliminar a ${editado}` }).click();
  await page.getByRole('button', { name: 'Eliminar usuario' }).click();
  await expect(page.getByRole('row', { name: editado })).toHaveCount(0);
  // No es solo la interfaz: al recargar, Postgres tampoco lo tiene.
  await page.reload();
  await expect(page.getByText(/Ningún usuario coincide con/)).toBeVisible();
});

test('el RUT es único: Postgres rechaza un duplicado al registrar y al editar, y la interfaz lo explica', async ({
  page,
  api,
}) => {
  const etiqueta = etiquetaUnica();
  const rutOcupado = rutAlAzar();
  await api.crearUsuario(`Primera Persona ${etiqueta}`, rutOcupado.normalizado);
  const segunda = await api.crearUsuario(
    `Segunda Persona ${etiqueta}`,
    rutAlAzar().normalizado,
  );
  const mensajeDuplicado = `Ya existe un usuario con el RUT ${rutOcupado.formateado}`;

  // Al editar con el lápiz: el PATCH choca con UNIQUE y responde 409, no 500.
  await page.goto(tablaFiltrada(etiqueta));
  await expect(page.getByText('2 usuarios encontrados')).toBeVisible();
  await page
    .getByRole('button', { name: `Editar a ${segunda.nombre}` })
    .click();
  const ventana = page.getByRole('dialog', { name: segunda.nombre });
  const campoRut = ventana.getByLabel('RUT', { exact: true });
  await campoRut.fill(rutOcupado.formateado);
  await ventana.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(ventana.getByText(mensajeDuplicado)).toBeVisible();
  await expect(campoRut).toHaveAttribute('aria-invalid', 'true');

  // Un RUT libre, tecleado sin puntos ni guion, se guarda normalizado.
  const rutNuevo = rutAlAzar();
  await campoRut.clear();
  await campoRut.pressSequentially(rutNuevo.tecleado);
  await ventana.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(
    ventana.getByText(`Se guardaron los cambios de ${segunda.nombre}.`),
  ).toBeVisible();
  await expect(ventana).toContainText(rutNuevo.formateado);
  expect(await api.obtenerUsuario(segunda.id)).toMatchObject({
    rut: rutNuevo.normalizado,
    version: 2,
  });

  await page.keyboard.press('Escape');
  await expect(page.getByRole('row', { name: segunda.nombre })).toContainText(
    rutNuevo.formateado,
  );

  // Al registrar: el RUT escrito con puntos se normaliza y también choca.
  await abrirPestana(page, 'Registrar usuario');
  await registrarUsuario(
    page,
    `Tercera Persona ${etiqueta}`,
    rutOcupado.formateado,
  );
  await expect(page.getByText(mensajeDuplicado)).toBeVisible();
  // Con datos en el formulario, recargar pediría confirmar: se navega dentro
  // de la app, que no la pide.
  await abrirPestana(page, 'Tabla de usuarios');
  await page.getByLabel('Buscar por nombre o RUT').fill(etiqueta);
  await expect(page.getByText('2 usuarios encontrados')).toBeVisible();
  await expect(page.getByRole('row', { name: /Tercera Persona/ })).toHaveCount(
    0,
  );
});

test('la API pagina y ordena; la página y el orden quedan en la URL y sobreviven a recargar', async ({
  page,
  api,
}) => {
  const etiqueta = etiquetaUnica();
  // Uno más de los que caben en una página (20). En orden: también se crean
  // en orden de nombre.
  const nombres = Array.from(
    { length: 21 },
    (_, i) => `Paginado ${etiqueta} ${String(i + 1).padStart(2, '0')}`,
  );
  for (const nombre of nombres) {
    await api.crearUsuario(nombre, rutAlAzar().normalizado);
  }
  const primero = nombres[0];
  const ultimo = nombres[nombres.length - 1];

  await page.goto(tablaFiltrada(etiqueta));
  await expect(page.getByText('21 usuarios encontrados')).toBeVisible();
  const filas = page.getByRole('row').filter({ hasText: etiqueta });
  const paginas = page.getByRole('navigation', { name: 'Páginas de usuarios' });
  await expect(paginas).toContainText('Página 1 de 2');
  await expect(filas).toHaveCount(20);
  await expect(filas.first()).toContainText(primero);

  await paginas.getByRole('button', { name: 'Siguiente' }).click();
  await expect(paginas).toContainText('Página 2 de 2');
  await expect(filas).toHaveCount(1);
  await expect(filas.first()).toContainText(ultimo);
  await expect(page).toHaveURL((url) => url.searchParams.get('pagina') === '2');

  // Otro orden vuelve a la primera página, ahora de la Z a la A.
  const orden = page.getByLabel('Ordenar por');
  await orden.selectOption({ label: 'Nombre (Z–A)' });
  await expect(paginas).toContainText('Página 1 de 2');
  await expect(filas.first()).toContainText(ultimo);
  await expect(page).toHaveURL(
    (url) =>
      url.searchParams.get('orden') === '-nombre' &&
      !url.searchParams.has('pagina'),
  );

  await page.reload();
  await expect(orden).toHaveValue('-nombre');
  await expect(page.getByLabel('Buscar por nombre o RUT')).toHaveValue(
    etiqueta,
  );
  await expect(filas.first()).toContainText(ultimo);
});

test.describe('dos personas trabajan a la vez', () => {
  test('si otra persona guardó antes, la API responde 412 y su cambio no se pisa', async ({
    page,
    otraPersona,
    api,
  }) => {
    const etiqueta = etiquetaUnica();
    const usuario = await api.crearUsuario(
      `Elena Paz ${etiqueta}`,
      rutAlAzar().normalizado,
    );
    const deLaOtra = `Elena Paz Soto ${etiqueta}`;

    // Las dos abren la edición sobre la versión 1, cada una en su navegador.
    for (const pagina of [page, otraPersona]) {
      await pagina.goto(tablaFiltrada(etiqueta));
      await pagina
        .getByRole('button', { name: `Editar a ${usuario.nombre}` })
        .click();
      await expect(
        pagina.getByRole('dialog').getByLabel('Nombre', { exact: true }),
      ).toHaveValue(usuario.nombre);
    }

    // La otra persona guarda primero: el usuario pasa a la versión 2.
    const suVentana = otraPersona.getByRole('dialog');
    await suVentana.getByLabel('Nombre', { exact: true }).fill(deLaOtra);
    await suVentana.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(
      suVentana.getByText(`Se guardaron los cambios de ${deLaOtra}.`),
    ).toBeVisible();

    // Guardar sobre la versión 1 ya no se puede: If-Match "1" → 412.
    const ventana = page.getByRole('dialog');
    await ventana
      .getByLabel('Nombre', { exact: true })
      .fill(`Elena Paz Ruiz ${etiqueta}`);
    const patch = page.waitForResponse((r) => r.request().method() === 'PATCH');
    await ventana.getByRole('button', { name: 'Guardar cambios' }).click();
    const respuesta = await patch;
    expect(respuesta.request().headers()['if-match']).toBe('"1"');
    expect(respuesta.status()).toBe(412);
    await expect(ventana.getByRole('alert')).toContainText(
      'Otra persona modificó a este usuario mientras lo editabas',
    );

    // Al cancelar se ven los datos vigentes: los de la otra persona.
    await ventana.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByRole('dialog', { name: deLaOtra })).toBeVisible();
    expect(await api.obtenerUsuario(usuario.id)).toMatchObject({
      nombre: deLaOtra,
      version: 2,
    });
  });

  test('si otra persona lo eliminó, guardar la edición responde 404 y la interfaz lo explica', async ({
    page,
    api,
  }) => {
    const etiqueta = etiquetaUnica();
    const usuario = await api.crearUsuario(
      `Luis Mora ${etiqueta}`,
      rutAlAzar().normalizado,
    );

    await page.goto(tablaFiltrada(etiqueta));
    await page
      .getByRole('button', { name: `Editar a ${usuario.nombre}` })
      .click();
    const ventana = page.getByRole('dialog');
    await ventana
      .getByLabel('Nombre', { exact: true })
      .fill(`Luis Mora Díaz ${etiqueta}`);

    // Mientras edita, otra persona lo elimina.
    await api.eliminarUsuario(usuario.id);

    await ventana.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(ventana.getByRole('alert')).toContainText(
      'Este usuario ya no existe',
    );
    await page.keyboard.press('Escape');
    await expect(page.getByRole('row', { name: usuario.nombre })).toHaveCount(
      0,
    );
  });
});

test.describe('con una cuenta de operador', () => {
  test.use({ sesion: 'operador' });

  test('registra, edita y elimina usuarios: la API se lo permite', async ({
    page,
  }) => {
    const etiqueta = etiquetaUnica();
    const nombre = `Oscar Vera ${etiqueta}`;
    const editado = `Oscar Vera Díaz ${etiqueta}`;

    await page.goto('/panel/usuarios/registrar');
    await expect(
      page.getByText(/Sesión iniciada como operador\./),
    ).toBeVisible();
    await registrarUsuario(page, nombre, rutAlAzar().tecleado);
    await expect(
      page
        .getByRole('status')
        .filter({ hasText: `Usuario registrado: ${nombre}.` }),
    ).toBeVisible();

    await page.goto(tablaFiltrada(etiqueta));
    await page.getByRole('button', { name: `Editar a ${nombre}` }).click();
    const ventana = page.getByRole('dialog');
    await ventana.getByLabel('Nombre', { exact: true }).fill(editado);
    await ventana.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(
      ventana.getByText(`Se guardaron los cambios de ${editado}.`),
    ).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: `Eliminar a ${editado}` }).click();
    await page.getByRole('button', { name: 'Eliminar usuario' }).click();
    await expect(
      page
        .getByRole('status')
        .filter({ hasText: `Usuario eliminado: ${editado}.` }),
    ).toBeVisible();
    await expect(page.getByRole('row', { name: editado })).toHaveCount(0);
  });
});
