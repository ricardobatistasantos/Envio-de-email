import { EmailSchema } from "@application/email.dto";
import { EmailService } from "@application/email.use-case";
import { BullMqManager } from "@infra/bull-mq.manager";
import { EmailListener } from "@presentation/email.listener";

describe('EmailListener', () => {
  let bullMqManager: jest.Mocked<BullMqManager>;
  let emailService: jest.Mocked<EmailService>;
  let listener: EmailListener;
  let parseSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    bullMqManager = {
      worker: jest.fn(),
    } as any;

    emailService = {
      execute: jest.fn(),
    } as any;

    parseSpy = jest.spyOn(EmailSchema, 'parse');

    listener = new EmailListener(bullMqManager, emailService);
  });

  it('deve registrar um worker na inicialização', async () => {
    await listener.onModuleInit();

    expect(bullMqManager.worker).toHaveBeenCalledWith(
      'email-queue',
      expect.any(Function),
      3,
    );
  });

  it('deve processar job válido', async () => {
    let handler: any;
    bullMqManager.worker.mockImplementation((_queue, func) => {
      handler = func;
      return {} as any;
    });

    await listener.onModuleInit();

    const data = { to: 'a@test.com', subject: 'xxxxx', text: 'yyyyyy' };
    parseSpy.mockReturnValueOnce(data); // validação ok

    await handler({ data });

    expect(emailService.execute).toHaveBeenCalledWith(data);
  });

  it('deve lançar erro se payload for inválido', async () => {
    let handler: any;
    bullMqManager.worker.mockImplementation((_queue, func) => {
      handler = func;
      return {} as any;
    });

    await listener.onModuleInit();

    parseSpy.mockImplementationOnce(() => {
      throw new Error('fails validation');
    });

    await expect(handler({ data: { invalid: 'xxx' } }))
      .rejects.toThrow(/fails validation/);
  });
});