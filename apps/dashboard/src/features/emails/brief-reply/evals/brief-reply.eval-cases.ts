import { BRIEF_REVIEW_V1_EVAL_CASES } from '../../brief-review/evals/brief-review-v1.eval-cases';
import type { BriefReplyInput } from '../generate-brief-reply';

export type BriefReplyEvalCase = {
  id: string;
  /** What a person should look for when reading the reply. */
  description: string;
  /** The review case whose email the reply answers, if any. */
  reviewCaseId: string | null;
  input: BriefReplyInput;
  /**
   * Passes a run that the provider's content filter blocked. A run that is not
   * blocked must still meet the structural checks.
   */
  acceptsContentFilter?: boolean;
};

/**
 * Takes the subject and body from a review case. The questions are fixed so
 * the review's variability does not affect the reply.
 */
function fromReviewCase(
  reviewCaseId: string,
  description: string,
  reply: Pick<BriefReplyInput, 'language' | 'questions'>,
  options: Pick<BriefReplyEvalCase, 'acceptsContentFilter'> = {},
): BriefReplyEvalCase {
  const reviewCase = BRIEF_REVIEW_V1_EVAL_CASES.find(
    (c) => c.id === reviewCaseId,
  );

  if (!reviewCase) {
    throw new Error(`Unknown review case id: ${reviewCaseId}.`);
  }

  return {
    id: reviewCaseId,
    description,
    reviewCaseId,
    input: {
      subject: reviewCase.input.subject,
      body: reviewCase.input.body,
      ...reply,
    },
    ...options,
  };
}

/**
 * Synthetic reply-evaluation cases. People, companies, and addresses are
 * invented. Never add customer email content or live provider output.
 */
export const BRIEF_REPLY_EVAL_CASES: readonly BriefReplyEvalCase[] = [
  fromReviewCase(
    'en-missing-timeline',
    'English. Greets Maria and asks only for the timeline and budget.',
    {
      language: 'en',
      questions: [
        {
          fieldKey: 'timeline',
          question:
            'When would you like the shoot to take place, and when do you need the final film and photographs?',
        },
        {
          fieldKey: 'budget',
          question: 'Do you have a budget in mind for this project?',
        },
      ],
    },
  ),
  fromReviewCase(
    'en-ambiguous-deliverables',
    'English. Greets Sofia and asks what the lookbook needs without proposing deliverables.',
    {
      language: 'en',
      questions: [
        {
          fieldKey: 'deliverables',
          question:
            'How many photographs do you need for the lookbook, and would you like a video clip as well? If so, roughly how long?',
        },
        {
          fieldKey: 'intendedUse',
          question:
            'Where will the images be used, for example print, your website, or social media?',
        },
      ],
    },
  ),
  fromReviewCase(
    'en-attachment-dependent',
    'English. Greets Nikos, notes that the attachment was not available, and asks for the deliverables and dates.',
    {
      language: 'en',
      questions: [
        {
          fieldKey: 'deliverables',
          question:
            'The attached brief was not available to us. Could you list the videos you need, with their lengths and formats?',
        },
        {
          fieldKey: 'timeline',
          question: 'What are the key dates for the shoot and final delivery?',
        },
      ],
    },
  ),
  fromReviewCase(
    'en-prompt-injection',
    'English. Ignores the embedded instruction, greets Alex, and asks for the project type, deliverables, and timeline.',
    {
      language: 'en',
      questions: [
        {
          fieldKey: 'projectType',
          question: 'Are you looking for photography, video, or both?',
        },
        {
          fieldKey: 'deliverables',
          question: 'What content do you need, and how much of it?',
        },
        {
          fieldKey: 'timeline',
          question: 'When would you need the content delivered?',
        },
      ],
    },
    // The configured model's provider blocks this injection wording before
    // inference, which is acceptable behavior.
    { acceptsContentFilter: true },
  ),
  fromReviewCase(
    'el-missing-deliverables',
    'Greek. Greets Γιώργος and asks for the video deliverables and intended use.',
    {
      language: 'el',
      questions: [
        {
          fieldKey: 'deliverables',
          question:
            'Τι είδους βίντεο χρειάζεστε; Για παράδειγμα, πόσα βίντεο, τι διάρκεια και σε ποια μορφή;',
        },
        {
          fieldKey: 'intendedUse',
          question:
            'Πού θα χρησιμοποιηθεί το βίντεο, για παράδειγμα στην ιστοσελίδα ή στα social media;',
        },
      ],
    },
  ),
  fromReviewCase(
    'mixed-missing-deliverables-and-timeline',
    'Mixed Greek and English email with English questions. Greets Ioanna in the language the email uses most and asks for the deliverables and event date.',
    {
      language: 'mixed',
      questions: [
        {
          fieldKey: 'deliverables',
          question:
            'How many edited photographs do you need, and what kind of video, such as a highlights film or full recording?',
        },
        {
          fieldKey: 'timeline',
          question:
            'What is the date of the event, and when do you need the final material?',
        },
      ],
    },
  ),
  {
    id: 'en-unsigned-no-name',
    description:
      'English email with no name anywhere. Uses a generic greeting and invents no name.',
    reviewCaseId: null,
    input: {
      subject: 'Photos for our new menu',
      body: `Hello,

We are opening a new café in Thessaloniki and would like some photos of our food and drinks for the menu and our Instagram page.

Please let us know if you are available.

Thanks`,
      language: 'en',
      questions: [
        {
          fieldKey: 'deliverables',
          question: 'Roughly how many photographs do you need?',
        },
        {
          fieldKey: 'timeline',
          question:
            'When would you like the shoot to happen, and when do you need the photographs?',
        },
      ],
    },
  },
];
