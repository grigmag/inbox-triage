import { describe, expect, it, vi } from 'vitest';
import { EmailSenderError } from '../email-sender-error';
import type { EmailMessage } from '../email-message.types';
import { SmtpEmailSender } from './smtp-email-sender';
import {
  SmtpTransportError,
  type SmtpMessage,
  type SmtpSendResult,
  type SmtpTransport,
} from './smtp-transport.types';

const VALID_RESULT: SmtpSendResult = {
  messageId: '<new@example.com>',
  acceptedRecipients: ['person@example.com'],
  rejectedRecipients: [],
};

class FakeSmtpTransport implements SmtpTransport {
  readonly send = vi.fn<(message: SmtpMessage) => Promise<SmtpSendResult>>();
  readonly close = vi.fn();
}

function createFixture(result: SmtpSendResult = VALID_RESULT) {
  const transport = new FakeSmtpTransport();
  transport.send.mockResolvedValue(result);
  const createTransport = vi.fn(() => transport);
  const sender = new SmtpEmailSender('studio@example.com', createTransport);
  return { sender, transport, createTransport };
}

describe('SmtpEmailSender', () => {
  it.each([
    {
      label: 'text',
      input: { to: [address('person@example.com')], text: 'Hello' },
    },
    {
      label: 'HTML',
      input: { to: [address('person@example.com')], html: '<p>Hello</p>' },
    },
    {
      label: 'alternative bodies',
      input: {
        to: [address('person@example.com')],
        text: 'Hello',
        html: '<p>Hello</p>',
      },
    },
  ])('submits a valid $label message once', async ({ input }) => {
    const { sender, transport } = createFixture();

    await expect(sender.send(input)).resolves.toEqual(VALID_RESULT);
    expect(transport.send).toHaveBeenCalledExactlyOnceWith({
      from: 'studio@example.com',
      envelope: {
        from: 'studio@example.com',
        to: ['person@example.com'],
      },
      ...input,
    });
  });

  it('preserves accepted input and uses every destination in the envelope', async () => {
    const { sender, transport } = createFixture();
    const input = {
      to: [{ name: 'Person', address: 'Person@Example.com' }],
      cc: [address('copy@example.com')],
      bcc: [address('blind@example.com')],
      replyTo: [address('reply@example.com')],
      subject: '',
      text: '  unchanged body  ',
    };

    await sender.send(input);

    expect(transport.send).toHaveBeenCalledExactlyOnceWith({
      from: 'studio@example.com',
      envelope: {
        from: 'studio@example.com',
        to: ['Person@Example.com', 'copy@example.com', 'blind@example.com'],
      },
      ...input,
    });
  });

  it('drops fields outside the input contract supplied at runtime', async () => {
    const { sender, transport } = createFixture();
    const input = {
      to: [address('person@example.com')],
      text: 'Hello',
      from: 'attacker@example.com',
      envelope: {
        from: 'attacker@example.com',
        to: ['attacker@example.com'],
      },
      raw: 'From: spoof@example.com\r\n\r\nSpoofed',
      headers: { 'X-Injected': 'value' },
      attachments: [{ path: '/etc/passwd' }],
    };

    await sender.send(input);

    const [message] = transport.send.mock.calls[0];
    expect(message).not.toHaveProperty('raw');
    expect(message).not.toHaveProperty('headers');
    expect(message).not.toHaveProperty('attachments');
    expect(message).toEqual({
      from: 'studio@example.com',
      envelope: {
        from: 'studio@example.com',
        to: ['person@example.com'],
      },
      to: input.to,
      text: 'Hello',
    });
  });

  it('replies to every Reply-To address and keeps extra destinations separate', async () => {
    const { sender, transport } = createFixture();
    const parent = message({
      from: [address('author@example.com')],
      replyTo: [
        { name: 'Primary', address: 'primary@example.com' },
        { name: 'Secondary', address: 'secondary@example.com' },
      ],
      subject: 'Production dates',
      references: ['<first@example.com>', '<second@example.com>'],
    });

    await expect(
      sender.reply(parent, {
        cc: [address('copy@example.com')],
        bcc: [address('blind@example.com')],
        text: 'Reply body',
      }),
    ).resolves.toEqual(VALID_RESULT);
    expect(transport.send).toHaveBeenCalledExactlyOnceWith({
      from: 'studio@example.com',
      envelope: {
        from: 'studio@example.com',
        to: [
          'primary@example.com',
          'secondary@example.com',
          'copy@example.com',
          'blind@example.com',
        ],
      },
      to: parent.replyTo,
      cc: [address('copy@example.com')],
      bcc: [address('blind@example.com')],
      subject: 'Re: Production dates',
      text: 'Reply body',
      html: undefined,
      inReplyTo: '<parent@example.com>',
      references: [
        '<first@example.com>',
        '<second@example.com>',
        '<parent@example.com>',
      ],
    });
  });

  it('falls back to every From address and preserves an absent subject', async () => {
    const { sender, transport } = createFixture();
    const parent = message({
      from: [address('one@example.com'), address('two@example.com')],
      subject: null,
      inReplyTo: ['<earlier@example.com>'],
    });

    await sender.reply(parent, { html: '<p>Reply body</p>' });

    expect(transport.send).toHaveBeenCalledExactlyOnceWith({
      from: 'studio@example.com',
      envelope: {
        from: 'studio@example.com',
        to: ['one@example.com', 'two@example.com'],
      },
      to: parent.from,
      cc: undefined,
      bcc: undefined,
      text: undefined,
      html: '<p>Reply body</p>',
      inReplyTo: '<parent@example.com>',
      references: ['<earlier@example.com>', '<parent@example.com>'],
    });
  });

  it.each(['Re: Existing prefix', 'rE: Mixed-case prefix'])(
    'preserves an existing reply subject: %s',
    async (subject) => {
      const { sender, transport } = createFixture();

      await sender.reply(message({ subject }), { text: 'Reply body' });

      expect(transport.send).toHaveBeenCalledWith(
        expect.objectContaining({ subject }),
      );
    },
  );

  it.each([
    {
      label: 'parent references',
      parent: message({ references: ['<root@example.com>'] }),
      expected: ['<root@example.com>', '<parent@example.com>'],
    },
    {
      label: 'one parent In-Reply-To identifier',
      parent: message({ inReplyTo: ['<root@example.com>'] }),
      expected: ['<root@example.com>', '<parent@example.com>'],
    },
    {
      label: 'multiple parent In-Reply-To identifiers',
      parent: message({
        inReplyTo: ['<one@example.com>', '<two@example.com>'],
      }),
      expected: ['<parent@example.com>'],
    },
    {
      label: 'no parent thread identifiers',
      parent: message(),
      expected: ['<parent@example.com>'],
    },
  ])('builds References from $label', async ({ parent, expected }) => {
    const { sender, transport } = createFixture();

    await sender.reply(parent, { text: 'Reply body' });

    expect(transport.send).toHaveBeenCalledWith(
      expect.objectContaining({ references: expected }),
    );
  });

  it.each([
    ['absent message ID', message({ messageId: null })],
    ['malformed message ID', message({ messageId: 'not-a-message-id' })],
  ])('rejects an invalid parent with %s', async (_label, parent) => {
    const { sender, transport, createTransport } = createFixture();

    await expect(sender.reply(parent, { text: 'Reply body' })).rejects.toEqual(
      new EmailSenderError('REPLY_MESSAGE_ID_MISSING'),
    );
    expect(createTransport).not.toHaveBeenCalled();
    expect(transport.send).not.toHaveBeenCalled();
  });

  it('rejects a parent without Reply-To or From recipients', async () => {
    const { sender, transport, createTransport } = createFixture();

    await expect(
      sender.reply(message({ from: [], replyTo: [] }), { text: 'Reply body' }),
    ).rejects.toEqual(new EmailSenderError('REPLY_RECIPIENT_MISSING'));
    expect(createTransport).not.toHaveBeenCalled();
    expect(transport.send).not.toHaveBeenCalled();
  });

  it.each([
    ['no body', message(), {}],
    ['empty bodies', message(), { text: '', html: '' }],
    [
      'malformed derived recipient',
      message({ replyTo: [address('not-an-address')] }),
      { text: 'Reply body' },
    ],
    [
      'derived subject injection',
      message({ subject: 'Hello\r\nBcc: person@example.com' }),
      { text: 'Reply body' },
    ],
    [
      'duplicate derived destinations',
      message({ replyTo: [address('Person@example.com')] }),
      { cc: [address('person@example.com')], text: 'Reply body' },
    ],
    [
      'too many derived recipients',
      message(),
      {
        cc: Array.from({ length: 50 }, (_, index) =>
          address(`person${index}@example.com`),
        ),
        text: 'Reply body',
      },
    ],
    [
      'oversized derived body',
      message(),
      { text: '\u00e9'.repeat(1024 * 512 + 1) },
    ],
  ])(
    'rejects $label before creating a transport',
    async (_label, parent, input) => {
      const { sender, transport, createTransport } = createFixture();

      await expect(sender.reply(parent, input)).rejects.toEqual(
        new EmailSenderError('INVALID_MESSAGE'),
      );
      expect(createTransport).not.toHaveBeenCalled();
      expect(transport.send).not.toHaveBeenCalled();
    },
  );

  it('normalizes partial acceptance for a reply', async () => {
    const transportResult = {
      messageId: '<reply@example.com>',
      acceptedRecipients: ['author@example.com'],
      rejectedRecipients: ['copy@example.com'],
    };
    const { sender, transport } = createFixture(transportResult);

    const result = await sender.reply(message(), {
      cc: [address('copy@example.com')],
      text: 'Reply body',
    });

    expect(result).toEqual(transportResult);
    expect(result.acceptedRecipients).not.toBe(
      transportResult.acceptedRecipients,
    );
    expect(result.rejectedRecipients).not.toBe(
      transportResult.rejectedRecipients,
    );
    expect(transport.send).toHaveBeenCalledOnce();
  });

  it.each([
    ['no recipients', { text: 'Hello' }],
    ['no body', { to: [address('person@example.com')] }],
    [
      'empty bodies',
      { to: [address('person@example.com')], text: '', html: '' },
    ],
    ['malformed address', { to: [address('not-an-address')], text: 'Hello' }],
    [
      'address injection',
      { to: [address('a@example.com\r\nBcc: b@example.com')], text: 'Hello' },
    ],
    [
      'name injection',
      {
        to: [{ name: 'Person\nBcc', address: 'a@example.com' }],
        text: 'Hello',
      },
    ],
    [
      'subject injection',
      {
        to: [address('a@example.com')],
        subject: 'Hi\r\nBcc: b@example.com',
        text: 'Hello',
      },
    ],
    [
      'invalid reply-to',
      {
        to: [address('a@example.com')],
        replyTo: [address('invalid')],
        text: 'Hello',
      },
    ],
    [
      'duplicate destinations',
      {
        to: [address('Person@example.com')],
        cc: [address('person@example.com')],
        text: 'Hello',
      },
    ],
    [
      'too many recipients',
      {
        to: Array.from({ length: 51 }, (_, index) =>
          address(`person${index}@example.com`),
        ),
        text: 'Hello',
      },
    ],
    [
      'oversized UTF-8 body',
      {
        to: [address('person@example.com')],
        text: '\u00e9'.repeat(1024 * 512 + 1),
      },
    ],
  ])('rejects $label before creating a transport', async (_label, input) => {
    const { sender, transport, createTransport } = createFixture();

    await expect(sender.send(input)).rejects.toEqual(
      new EmailSenderError('INVALID_MESSAGE'),
    );
    expect(createTransport).not.toHaveBeenCalled();
    expect(transport.send).not.toHaveBeenCalled();
  });

  it('allows exactly 50 recipients and a body of exactly 1 MiB', async () => {
    const { sender, transport } = createFixture();
    const input = {
      to: Array.from({ length: 50 }, (_, index) =>
        address(`person${index}@example.com`),
      ),
      text: 'a'.repeat(1024 * 1024),
    };

    await sender.send(input);

    expect(transport.send).toHaveBeenCalledOnce();
  });

  it('returns partial acceptance using copied package-owned arrays', async () => {
    const transportResult = {
      messageId: '<partial@example.com>',
      acceptedRecipients: ['accepted@example.com'],
      rejectedRecipients: ['rejected@example.com'],
    };
    const { sender } = createFixture(transportResult);

    const result = await sender.send({
      to: [address('accepted@example.com'), address('rejected@example.com')],
      text: 'Hello',
    });

    expect(result).toEqual(transportResult);
    expect(result.acceptedRecipients).not.toBe(
      transportResult.acceptedRecipients,
    );
    expect(result.rejectedRecipients).not.toBe(
      transportResult.rejectedRecipients,
    );
  });

  it.each([
    [new SmtpTransportError('authentication'), 'AUTHENTICATION_FAILED'],
    [new SmtpTransportError('connection'), 'CONNECTION_FAILED'],
    [new SmtpTransportError('unknown'), 'SEND_FAILED'],
    [new Error('sensitive provider response'), 'SEND_FAILED'],
  ] as const)('translates transport failures safely', async (failure, code) => {
    const { sender, transport } = createFixture();
    transport.send.mockRejectedValue(failure);

    await expect(
      sender.send({ to: [address('person@example.com')], text: 'Hello' }),
    ).rejects.toEqual(new EmailSenderError(code));
    expect(transport.send).toHaveBeenCalledOnce();
  });

  it.each([
    { ...VALID_RESULT, acceptedRecipients: [] },
    { ...VALID_RESULT, messageId: '' },
  ])('fails when SMTP does not confirm acceptance', async (result) => {
    const { sender, transport } = createFixture(result);

    await expect(
      sender.send({ to: [address('person@example.com')], text: 'Hello' }),
    ).rejects.toEqual(new EmailSenderError('SEND_FAILED'));
    expect(transport.send).toHaveBeenCalledOnce();
  });

  it('closes once and never creates or reconnects after close', async () => {
    const { sender, transport, createTransport } = createFixture();
    await sender.send({ to: [address('person@example.com')], text: 'Hello' });

    await sender.close();
    await sender.close();

    expect(transport.close).toHaveBeenCalledOnce();
    await expect(
      sender.send({ to: [address('person@example.com')], text: 'Again' }),
    ).rejects.toThrow('Email sender is closed.');
    expect(createTransport).toHaveBeenCalledOnce();
    expect(transport.send).toHaveBeenCalledOnce();
  });

  it('does not create a transport when closed before use', async () => {
    const { sender, createTransport } = createFixture();

    await sender.close();

    expect(createTransport).not.toHaveBeenCalled();
  });

  it('does not submit a reply after close', async () => {
    const { sender, transport, createTransport } = createFixture();
    await sender.reply(message(), { text: 'First reply' });

    await sender.close();

    await expect(
      sender.reply(message(), { text: 'Second reply' }),
    ).rejects.toThrow('Email sender is closed.');
    expect(createTransport).toHaveBeenCalledOnce();
    expect(transport.send).toHaveBeenCalledOnce();
  });

  it('stays closed when transport cleanup fails', async () => {
    const { sender, transport } = createFixture();
    await sender.send({ to: [address('person@example.com')], text: 'Hello' });
    transport.close.mockImplementation(() => {
      throw new Error('sensitive cleanup failure');
    });

    await expect(sender.close()).resolves.toBeUndefined();
    await expect(sender.close()).resolves.toBeUndefined();
    await expect(
      sender.send({ to: [address('person@example.com')], text: 'Again' }),
    ).rejects.toThrow('Email sender is closed.');
    expect(transport.close).toHaveBeenCalledOnce();
    expect(transport.send).toHaveBeenCalledOnce();
  });
});

function address(value: string) {
  return { name: null, address: value };
}

function message(overrides: Partial<EmailMessage> = {}): EmailMessage {
  return {
    ref: 'opaque-reference',
    from: [address('author@example.com')],
    subject: 'Original subject',
    receivedAt: new Date('2026-01-01T12:00:00Z'),
    isRead: true,
    sizeBytes: 100,
    messageId: '<parent@example.com>',
    inReplyTo: [],
    references: [],
    to: [address('studio@example.com')],
    cc: [],
    replyTo: [],
    sentAt: new Date('2026-01-01T11:59:00Z'),
    text: 'Original body',
    html: null,
    ...overrides,
  };
}
