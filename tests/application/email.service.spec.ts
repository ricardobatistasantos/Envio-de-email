import { EmailDTO } from '@application/email.dto';
import { EmailService } from '@application/email.use-case';
import { IEmailProvider } from '@core/email.provider';

describe('EmailService', () => {
  let emailProvider: jest.Mocked<IEmailProvider>;
  let service: EmailService;

  beforeEach(() => {
    emailProvider = {
      sendMail: jest.fn(),
    };
    service = new EmailService(emailProvider);
  });

  it('deve enviar email com sucesso', async () => {
    const dto: EmailDTO = { to: 'test@test.com', subject: 'Hello', text: 'World' };
    await service.execute(dto);
    expect(emailProvider.sendMail).toHaveBeenCalledWith('test@test.com', 'Hello', 'World');
  });

  it('deve lançar erro se provider falhar', async () => {
    emailProvider.sendMail.mockRejectedValueOnce(new Error('SMTP fail'));
    await expect(service.execute({ to: 'fail@test.com', subject: 'X', text: 'Y' }))
      .rejects.toThrow('SMTP fail');
  });
});