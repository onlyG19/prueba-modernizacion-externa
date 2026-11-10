interface ImportMetaEnv {
  /**
   * URL base de la API. Por defecto `/api`: en desarrollo la redirige el proxy
   * de Vite y en producción, el reverse proxy que sirva el frontend.
   */
  readonly VITE_API_URL?: string;
}
