import { z } from 'zod';

export const EmailSchema = z.object({
  to: z.string().email({ message: 'Invalid email' }),
  subject: z
    .string()
    .min(3, { message: 'The subject must be at least 3 characters long' }),
  text: z
    .string()
    .min(5, { message: 'The body of the email must be at least 5 characters long' }),
});

export type EmailDTO = z.infer<typeof EmailSchema>;
