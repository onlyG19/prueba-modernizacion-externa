import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  /**
   * Usuario administrador (variable de entorno `AUTH_USER`).
   * @example 'admin'
   */
  @IsString()
  @IsNotEmpty({ message: 'El usuario no puede estar vacío' })
  username: string;

  /**
   * Contraseña del administrador.
   * @example 'mi-contraseña-segura'
   */
  @IsString()
  @IsNotEmpty({ message: 'La contraseña no puede estar vacía' })
  password: string;
}
