import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  const login = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: { login } }],
    }).compile();

    controller = module.get(AuthController);
  });

  it('debe delegar el login en AuthService y devolver su respuesta', async () => {
    const respuesta = {
      accessToken: 'token',
      tokenType: 'Bearer',
      expiresIn: 3600,
    };
    login.mockResolvedValue(respuesta);
    const dto = { username: 'admin', password: 'correcta' };

    await expect(controller.login(dto)).resolves.toBe(respuesta);
    expect(login).toHaveBeenCalledWith(dto);
  });
});
