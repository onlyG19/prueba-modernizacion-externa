import { IsNotEmpty, IsString, MaxLength, Matches } from 'class-validator';

export class CreateUsuarioDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  @MaxLength(45, { message: 'El nombre no puede superar los 45 caracteres' })
  nombre: string;

  @IsString()
  @IsNotEmpty({ message: 'El RUT no puede estar vacío' })
  @MaxLength(12, { message: 'El RUT no puede superar los 12 caracteres' })
  @Matches(/^\d{1,8}-[\dkK]$/, {
    message: 'El RUT debe tener el formato válido chileno (ej: 12345678-9)',
  })
  rut: string;
}
