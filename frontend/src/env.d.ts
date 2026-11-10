interface ImportMetaEnv {
  /**
   * URL base de la API, con su versión. Por defecto `/api/v1`: en desarrollo la
   * redirige el proxy de Vite y en producción, el reverse proxy (nginx).
   */
  readonly VITE_API_URL?: string;
}
