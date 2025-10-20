import { z } from 'zod';

export const EmailSchema = z.object({
  to: z.string().email({ message: 'E-mail inválido' }),
  subject: z.string().min(3, { message: 'O assunto deve ter pelo menos 3 caracteres' }),
  text: z.string().min(5, { message: 'O corpo do e-mail deve ter pelo menos 5 caracteres' }),
});

export type EmailDTO = z.infer<typeof EmailSchema>;