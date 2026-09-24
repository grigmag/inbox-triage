import { EmailSenderError } from '../email-sender-error';
import type {
  EmailSender,
  ReplyEmailInput,
  SendEmailInput,
  SendEmailResult,
} from '../email-sender.types';
import type { EmailMessage } from '../email-message.types';
import { parseSingleMessageIdentifier } from '../mime/parse-message-identifiers';
import type { SmtpMessage, SmtpTransport } from './smtp-transport.types';
import { translateSmtpError } from './translate-smtp-error';
import { validateSendEmail } from './validate-send-email';

export class SmtpEmailSender implements EmailSender {
  private transport: SmtpTransport | null = null;
  private closed = false;

  constructor(
    private readonly username: string,
    private readonly createTransport: () => SmtpTransport,
  ) {}

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    this.assertOpen();
    return this.submit(input);
  }

  async reply(
    parent: EmailMessage,
    input: ReplyEmailInput,
  ): Promise<SendEmailResult> {
    this.assertOpen();

    const messageId = parent.messageId;
    if (
      messageId === null ||
      parseSingleMessageIdentifier(messageId) !== messageId
    ) {
      throw new EmailSenderError('REPLY_MESSAGE_ID_MISSING');
    }

    const recipients = parent.replyTo.length > 0 ? parent.replyTo : parent.from;
    if (recipients.length === 0) {
      throw new EmailSenderError('REPLY_RECIPIENT_MISSING');
    }

    const subject = replySubject(parent.subject);
    const references = replyReferences(parent, messageId);

    return this.submit(
      {
        to: recipients,
        cc: input.cc,
        bcc: input.bcc,
        ...(subject === undefined ? {} : { subject }),
        text: input.text,
        html: input.html,
      },
      { inReplyTo: messageId, references },
    );
  }

  private async submit(
    input: SendEmailInput,
    threadHeaders: Pick<SmtpMessage, 'inReplyTo' | 'references'> = {},
  ): Promise<SendEmailResult> {
    const validated = validateSendEmail(this.username, input);

    try {
      const result = await this.getTransport().send({
        ...validated.input,
        ...threadHeaders,
        from: this.username,
        envelope: {
          from: this.username,
          to: validated.envelopeRecipients,
        },
      });

      if (
        result.acceptedRecipients.length === 0 ||
        result.messageId.length === 0
      ) {
        throw new EmailSenderError('SEND_FAILED');
      }

      return {
        messageId: result.messageId,
        acceptedRecipients: [...result.acceptedRecipients],
        rejectedRecipients: [...result.rejectedRecipients],
      };
    } catch (error) {
      throw translateSmtpError(error);
    }
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }
    this.closed = true;
    try {
      this.transport?.close();
    } catch {
      // close() remains terminal and idempotent if transport cleanup fails.
    }
    this.transport = null;
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new Error('Email sender is closed.');
    }
  }

  private getTransport(): SmtpTransport {
    this.transport ??= this.createTransport();
    return this.transport;
  }
}

function replySubject(subject: string | null): string | undefined {
  if (subject === null) {
    return undefined;
  }
  return /^re:/i.test(subject) ? subject : `Re: ${subject}`;
}

function replyReferences(parent: EmailMessage, messageId: string): string[] {
  if (parent.references.length > 0) {
    return [...parent.references, messageId];
  }
  if (parent.inReplyTo.length === 1) {
    return [parent.inReplyTo[0], messageId];
  }
  return [messageId];
}
