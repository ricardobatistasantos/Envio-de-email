export interface IEmailProvider {
  sendMail(to: string, subject: string, text: string): Promise<void>;
}