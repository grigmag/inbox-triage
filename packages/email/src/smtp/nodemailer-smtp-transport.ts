import nodemailer, { type SendMailOptions, type Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import type { EmailAddress } from '../email-message.types';
import type {
  SmtpMessage,
  SmtpSendResult,
  SmtpTransport,
  SmtpTransportErrorKind,
} from './smtp-transport.types';
import { SmtpTransportError } from './smtp-transport.types';

const CONNECTION_TIMEOUT_MS = 10_000;
const GREETING_TIMEOUT_MS = 10_000;
const SOCKET_TIMEOUT_MS = 30_000;

export interface NodemailerSmtpTransportConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
}

export class NodemailerSmtpTransport implements SmtpTransport {
  private readonly transporter: Transporter<SMTPTransport.SentMessageInfo>;

  constructor(config: NodemailerSmtpTransportConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      pool: false,
      auth: {
        user: config.username,
        pass: config.password,
      },
      tls: {
        rejectUnauthorized: true,
      },
      logger: false,
      debug: false,
      connectionTimeout: CONNECTION_TIMEOUT_MS,
      greetingTimeout: GREETING_TIMEOUT_MS,
      socketTimeout: SOCKET_TIMEOUT_MS,
    });
  }

  async send(message: SmtpMessage): Promise<SmtpSendResult> {
    try {
      const result = await this.transporter.sendMail(
        toNodemailerMessage(message),
      );
      return {
        messageId: result.messageId,
        acceptedRecipients: result.accepted.map(normalizeAddress),
        rejectedRecipients: result.rejected.map(normalizeAddress),
      };
    } catch (error) {
      throw new SmtpTransportError(classifySmtpError(error));
    }
  }

  async verify(): Promise<void> {
    try {
      await this.transporter.verify();
    } catch (error) {
      throw new SmtpTransportError(classifySmtpError(error));
    }
  }

  close(): void {
    this.transporter.close();
  }
}

function toNodemailerMessage(message: SmtpMessage): SendMailOptions {
  return {
    from: message.from,
    envelope: { from: message.envelope.from, to: message.envelope.to },
    to: message.to?.map(toNodemailerAddress),
    cc: message.cc?.map(toNodemailerAddress),
    bcc: message.bcc?.map(toNodemailerAddress),
    replyTo: message.replyTo?.map(toNodemailerAddress),
    subject: message.subject,
    text: message.text,
    html: message.html,
    inReplyTo: message.inReplyTo,
    references: message.references,
    disableFileAccess: true,
    disableUrlAccess: true,
  };
}

function toNodemailerAddress({ name, address }: EmailAddress) {
  return { name: name ?? undefined, address };
}

function normalizeAddress(address: string | { address: string }): string {
  return typeof address === 'string' ? address : address.address;
}

function classifySmtpError(error: unknown): SmtpTransportErrorKind {
  const code = readErrorCode(error);
  if (code === 'EAUTH') {
    return 'authentication';
  }
  if (code === 'EENVELOPE') {
    return 'envelope';
  }
  if (
    new Set([
      'ECONNECTION',
      'ECONNREFUSED',
      'ECONNRESET',
      'EHOSTUNREACH',
      'ENETUNREACH',
      'ENOTFOUND',
      'ESOCKET',
      'ETIMEDOUT',
      'EAI_AGAIN',
    ]).has(code ?? '')
  ) {
    return 'connection';
  }
  return 'unknown';
}

function readErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }
  return typeof error.code === 'string' ? error.code : undefined;
}
