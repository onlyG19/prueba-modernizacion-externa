import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';
import {
  normalizarUsername,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
} from '../domain/credenciales';

export class CreateCuentaDto {
  /**
   * Usuario con que se ingresará. Se guarda sin espacios en los extremos y en
   * minúsculas: `" Maria.Lopez "` queda `"maria.lopez"`.
   * @example 'maria.lopez'
   */
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizarUsername(value) : value,
  )
  @IsString({ message: 'El usuario debe ser texto' })
  @Length(USERNAME_MIN_LENGTH, USERNAME_MAX_LENGTH, {
    message: `El usuario debe tener entre ${USERNAME_MIN_LENGTH} y ${USERNAME_MAX_LENGTH} caracteres`,
  })
  @Matches(USERNAME_PATTERN, {
    message:
      'El usuario solo puede tener letras sin tildes, números, puntos, guiones y guiones bajos',
  })
  username!: string;

  /**
   * Contraseña de la cuenta. Solo se guarda su hash (scrypt).
   * @example 'una frase larga y secreta'
   */
  @IsString({ message: 'La contraseña debe ser texto' })
  @Length(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, {
    message: `La contraseña debe tener entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres`,
  })
  password!: string;
}
