import { once } from 'node:events';
import { createServer, type Socket } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ImapFlowTransport } from './imap/imapflow-transport';
import { NodemailerSmtpTransport } from './smtp/nodemailer-smtp-transport';

const ports = vi.hoisted(() => ({ imap: 0, smtp: 0 }));

// Keep the real transports and libraries. Only redirect their endpoints to
// local protocol servers so no credentials or traffic reach a provider.
vi.mock('./create-mail-transports', () => ({
  createImapTransport: (
    _host: string,
    credentials: { username: string; password: string },
  ) =>
    new ImapFlowTransport({
      host: '127.0.0.1',
      port: ports.imap,
      secure: false,
      ...credentials,
    }),
  createSmtpTransport: (
    _host: string,
    credentials: { username: string; password: string },
  ) =>
    new NodemailerSmtpTransport({
      host: '127.0.0.1',
      port: ports.smtp,
      secure: false,
      ...credentials,
    }),
}));

import { checkEmailConnection } from './check-email-connection';

const cleanup: (() => Promise<void>)[] = [];
const gmail = {
  provider: 'gmail' as const,
  credentials: { username: 'studio@gmail.com', password: 'wrongapppassword' },
};

afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((close) => close()));
});

describe('checkEmailConnection with real protocol transports', () => {
  it.each([
    '[AUTHENTICATIONFAILED] Invalid credentials (Failure)',
    '[ALERT] Application-specific password required: https://support.google.com/accounts/answer/185833 (Failure)',
  ])(
    'classifies Gmail IMAP rejection %s and closes the socket',
    async (response) => {
      const imap = await startImapServer(response);
      ports.imap = imap.port;

      await expect(checkEmailConnection(gmail)).resolves.toEqual({
        status: 'failed',
        reason: 'authentication',
      });
      await imap.closed;
      expect(imap.sockets.size).toBe(0);
    },
  );

  it.each([
    '535 5.7.8 Username and Password not accepted. BadCredentials - gsmtp',
    '534 5.7.9 Application-specific password required. InvalidSecondFactor - gsmtp',
    '534 5.7.14 Please log in via your web browser and then try again. - gsmtp',
  ])(
    'classifies Gmail SMTP rejection %s and closes both sockets',
    async (response) => {
      const imap = await startImapServer();
      const smtp = await startProtocolServer(
        '220 smtp.gmail.com ESMTP',
        (socket, line) => {
          if (line.startsWith('EHLO ')) {
            socket.write('250-smtp.gmail.com\r\n250 AUTH PLAIN LOGIN\r\n');
          } else if (line.startsWith('AUTH PLAIN ')) {
            // Leave the connection open: the client must clean up after rejection.
            socket.write(`${response}\r\n`);
          } else {
            socket.write('500 Unexpected command\r\n');
          }
        },
      );
      ports.imap = imap.port;
      ports.smtp = smtp.port;

      await expect(checkEmailConnection(gmail)).resolves.toEqual({
        status: 'failed',
        reason: 'authentication',
      });
      await Promise.all([imap.closed, smtp.closed]);
      expect(imap.sockets.size).toBe(0);
      expect(smtp.sockets.size).toBe(0);
    },
  );
});

function startImapServer(rejection?: string) {
  let authenticationTag: string | undefined;
  return startProtocolServer('* OK IMAP ready', (socket, line) => {
    if (authenticationTag) {
      socket.write(
        rejection
          ? `${authenticationTag} NO ${rejection}\r\n`
          : `${authenticationTag} OK Authenticated\r\n`,
      );
      authenticationTag = undefined;
      return;
    }
    const [tag, command] = line.split(' ');
    if (command === 'CAPABILITY') {
      socket.write(
        `* CAPABILITY IMAP4rev1 AUTH=PLAIN\r\n${tag} OK Capabilities\r\n`,
      );
    } else if (command === 'AUTHENTICATE') {
      authenticationTag = tag;
      socket.write('+ \r\n');
    } else if (command === 'LOGOUT') {
      socket.write(`* BYE Logging out\r\n${tag} OK Logout\r\n`);
    } else if (command === 'LIST') {
      socket.write(`* LIST () "/" ""\r\n${tag} OK List\r\n`);
    } else {
      socket.write(`${tag} BAD Unexpected command\r\n`);
    }
  });
}

async function startProtocolServer(
  greeting: string,
  onLine: (socket: Socket, line: string) => void,
) {
  const sockets = new Set<Socket>();
  let resolveClosed: () => void;
  const closed = new Promise<void>((resolve) => {
    resolveClosed = resolve;
  });
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.on('error', () => {});
    socket.once('close', () => {
      sockets.delete(socket);
      resolveClosed();
    });
    socket.setEncoding('utf8');
    let buffer = '';
    socket.on('data', (chunk: string) => {
      buffer += chunk;
      let end: number;
      while ((end = buffer.indexOf('\r\n')) !== -1) {
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        onLine(socket, line);
      }
    });
    socket.write(`${greeting}\r\n`);
  });
  cleanup.push(async () => {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Expected a local TCP address.');
  }
  return { port: address.port, sockets, closed };
}
