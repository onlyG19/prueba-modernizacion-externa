import { etagDeVersion, versionesDeIfMatch } from './etag';

describe('etagDeVersion', () => {
  it('debe entregar un ETag fuerte con la versión', () => {
    expect(etagDeVersion(3)).toBe('"3"');
  });
});

describe('versionesDeIfMatch', () => {
  it.each([
    ['sin cabecera', undefined],
    ['con *', '*'],
  ])('no debe exigir versión %s', (_caso, cabecera) => {
    expect(versionesDeIfMatch(cabecera)).toBeUndefined();
  });

  it.each([
    ['"3"', [3]],
    ['"2", "3"', [2, 3]],
    // If-Match compara en forma fuerte: una etiqueta débil no coincide.
    ['W/"3"', []],
    ['"abc"', []],
  ])('debe interpretar %s como %j', (cabecera, versiones) => {
    expect(versionesDeIfMatch(cabecera)).toEqual(versiones);
  });
});
