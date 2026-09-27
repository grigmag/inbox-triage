import { z } from 'zod';
import { BRIEF_REPLY_MAX_BODY_LENGTH } from './brief-reply.config';

/**
 * The reply body the user sends. The composer and server enforce the same rule,
 * and sending never trims or rewrites the body.
 */
export const briefReplyBodySchema = z
  .string()
  .max(BRIEF_REPLY_MAX_BODY_LENGTH)
  .refine((value) => value.trim().length > 0, 'Must contain visible text');
