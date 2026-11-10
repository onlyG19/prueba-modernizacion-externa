/** Une nombres de clase CSS, ignorando los valores falsos. */
export function clases(...nombres: Array<string | false | null | undefined>) {
  return nombres.filter(Boolean).join(' ');
}
