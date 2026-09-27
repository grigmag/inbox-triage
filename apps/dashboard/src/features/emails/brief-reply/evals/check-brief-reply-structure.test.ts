import { describe, expect, it } from 'vitest';
import { checkBriefReplyStructure } from './check-brief-reply-structure';

function failed(body: string) {
  return checkBriefReplyStructure(body)
    .filter((result) => !result.passed)
    .map(({ check, match }) => ({ check, match }));
}

describe('checkBriefReplyStructure', () => {
  it('passes a plain-text reply with a dash list', () => {
    expect(
      failed(`Dear Maria,

Thank you for your message. Could you tell us:

- when you would like the shoot to take place
- your budget for the project

Kind regards`),
    ).toEqual([]);
  });

  it('passes a Greek plain-text reply', () => {
    expect(
      failed(
        'Καλημέρα κύριε Σαββίδη,\n\nΣας ευχαριστούμε για το μήνυμά σας.\n\nΜε εκτίμηση',
      ),
    ).toEqual([]);
  });

  it('fails an empty body', () => {
    expect(failed(' \n ')).toEqual([{ check: 'nonEmpty', match: null }]);
  });

  it.each([
    ['Subject: Re: Launch video\n\nHello,', 'Subject: Re: Launch video'],
    ['Θέμα: Βίντεο\n\nΚαλημέρα,', 'Θέμα: Βίντεο'],
  ])('fails a subject line in %j', (body, match) => {
    expect(failed(body)).toEqual([{ check: 'noSubjectLine', match }]);
  });

  it.each([
    ['## Next steps', '## Next steps'],
    ['We need **your timeline**.', '**your timeline**'],
    ['We need __your timeline__.', '__your timeline__'],
    ['See [our site](https://example.com).', '[our site](https://example.com)'],
    ['Use `final.mp4`.', '`final.mp4`'],
  ])('fails Markdown in %j', (body, match) => {
    expect(failed(body)).toContainEqual({ check: 'noMarkdown', match });
  });

  it.each([
    ['<p>Hello</p>', '<p>'],
    ['Hello,<br>Thanks', '<br>'],
    ['<div class="x">Hi', '<div class="x">'],
  ])('fails HTML in %j', (body, match) => {
    expect(failed(body)).toEqual([{ check: 'noHtml', match }]);
  });

  it('does not treat angle-bracketed comparisons as HTML', () => {
    expect(failed('A budget < 3000 or > 1000 works.')).toEqual([]);
  });

  it.each([
    ['Kind regards,\n[Your Name]', '[Your Name]'],
    ['Dear {{name}},', '{{name}}'],
  ])('fails a placeholder in %j', (body, match) => {
    expect(failed(body)).toEqual([{ check: 'noPlaceholder', match }]);
  });
});
