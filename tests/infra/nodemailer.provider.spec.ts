import { NodemailerProvider } from '@infra/nodemailer.provider';
import nodemailer from 'nodemailer';

describe('NodemailerProvider', () => {
  let createTransportSpy: jest.SpyInstance;
  let sendMailSpy: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    sendMailSpy = jest.fn();

    createTransportSpy = jest.spyOn(nodemailer, 'createTransport').mockReturnValue({
      sendMail: sendMailSpy,
    } as any);

    process.env.GMAIL_USER = 'user@test.com';
    process.env.GMAIL_PASSWORD = 'pass';
    process.env.GMAIL_HOST = 'smtp.test.com';
    process.env.GMAIL_PORT = '587';
  });

  it('deve enviar email com sucesso', async () => {
    sendMailSpy.mockResolvedValueOnce({});

    const provider = new NodemailerProvider();
    await provider.sendMail('to@test.com', 'subject', 'message');

    expect(createTransportSpy).toHaveBeenCalledWith({
      host: 'smtp.test.com',
      port: 587,
      secure: false,
      auth: {
        user: 'user@test.com',
        pass: 'pass',
      },
    });

    expect(sendMailSpy).toHaveBeenCalledWith(expect.objectContaining({
      from: 'user@test.com',
      to: 'to@test.com',
      subject: 'subject',
      text: 'message',
    }));
  });

  it('deve lançar erro ao falhar no envio', async () => {
    sendMailSpy.mockRejectedValueOnce(new Error('SMTP fail'));

    const provider = new NodemailerProvider();

    await expect(
      provider.sendMail('to@test.com', 'subject', 'message'),
    ).rejects.toThrow('SMTP fail');
  });
});