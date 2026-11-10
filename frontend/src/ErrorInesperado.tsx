import { Component, type ErrorInfo, type ReactNode } from 'react';
import { BotonPrimario } from './ui/botones';

interface Estado {
  falla: boolean;
}

/**
 * Última red de seguridad: si un componente lanza al renderizar, se muestra
 * un mensaje con salida en vez de una pantalla en blanco.
 *
 * @remarks Es una clase porque React todavía solo ofrece los límites de error
 * como componentes de clase.
 */
export class ErrorInesperado extends Component<
  { children: ReactNode },
  Estado
> {
  state: Estado = { falla: false };

  static getDerivedStateFromError(): Estado {
    return { falla: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      'Error inesperado en la interfaz',
      error,
      info.componentStack,
    );
  }

  render() {
    if (!this.state.falla) {
      return this.props.children;
    }
    return (
      <main style={{ padding: 'var(--esp-6) var(--esp-4)', maxWidth: '40rem' }}>
        <h1>Algo salió mal</h1>
        <p style={{ margin: 'var(--esp-3) 0 var(--esp-5)' }}>
          La consola encontró un error inesperado. Recarga la página para
          continuar; tus datos guardados no se pierden.
        </p>
        <BotonPrimario onClick={() => window.location.reload()}>
          Recargar la página
        </BotonPrimario>
      </main>
    );
  }
}
