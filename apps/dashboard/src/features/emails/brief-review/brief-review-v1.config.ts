export const BRIEF_REVIEW_V1_FIELD_KEYS = [
  'projectType',
  'objective',
  'deliverables',
  'timeline',
  'location',
  'budget',
  'intendedUse',
  'creativeDirection',
  'talent',
] as const;

// Measured in JavaScript string length. The client and server both enforce it.
export const BRIEF_REVIEW_MAX_BODY_LENGTH = 50_000;

export type BriefReviewFieldKey = (typeof BRIEF_REVIEW_V1_FIELD_KEYS)[number];

type BriefReviewFieldDefinition = {
  label: string;
  promptDescription: string;
  renderKind: 'projectType' | 'text' | 'list';
  completionRule: 'projectIdentity' | 'required' | 'optional';
};

export const BRIEF_REVIEW_V1_FIELDS = {
  projectType: {
    label: 'Project type',
    promptDescription:
      'The requested production category: photography, video, photography and video, or another specified category.',
    renderKind: 'projectType',
    completionRule: 'projectIdentity',
  },
  objective: {
    label: 'Objective',
    promptDescription:
      'What the client wants the work to achieve, such as a product launch, campaign, catalogue, or event coverage.',
    renderKind: 'text',
    completionRule: 'projectIdentity',
  },
  deliverables: {
    label: 'Deliverables',
    promptDescription:
      'The requested outputs, including meaningful type and scope or quantity. A bare output such as "a video" or "some content", with no length, format, count, or other scope, is ambiguous.',
    renderKind: 'text',
    completionRule: 'required',
  },
  timeline: {
    label: 'Timeline',
    promptDescription:
      'Relevant shoot timing, delivery deadline, launch date, or usable time range.',
    renderKind: 'text',
    completionRule: 'required',
  },
  location: {
    label: 'Location',
    promptDescription:
      'Where production will happen, including a studio, client premises, remote setting, city, or venue.',
    renderKind: 'text',
    completionRule: 'optional',
  },
  budget: {
    label: 'Budget',
    promptDescription:
      'A stated budget, range, ceiling, or explicit request for the studio to propose a budget.',
    renderKind: 'text',
    completionRule: 'optional',
  },
  intendedUse: {
    label: 'Intended use',
    promptDescription:
      'The stated destinations or contexts for the finished material, returned as an open-ended list.',
    renderKind: 'list',
    completionRule: 'optional',
  },
  creativeDirection: {
    label: 'Creative direction',
    promptDescription:
      'Desired visual style, tone, references, or creative constraints.',
    renderKind: 'text',
    completionRule: 'optional',
  },
  talent: {
    label: 'Talent',
    promptDescription:
      'People appearing in the production and any stated casting responsibility.',
    renderKind: 'text',
    completionRule: 'optional',
  },
} as const satisfies Record<BriefReviewFieldKey, BriefReviewFieldDefinition>;

/**
 * Returns whether a field that isn't `provided` keeps the brief from being
 * `complete`, according to the field's `completionRule`:
 *
 * - `required`: blocks until the field itself is provided.
 * - `projectIdentity`: blocks only when neither `projectType` nor `objective`
 *   is provided. Either one is enough to identify the project.
 * - `optional`: never blocks.
 */
export function fieldBlocksCompletion(
  fieldKey: BriefReviewFieldKey,
  fields: Record<
    BriefReviewFieldKey,
    { status: 'provided' | 'missing' | 'ambiguous' }
  >,
): boolean {
  const rule = BRIEF_REVIEW_V1_FIELDS[fieldKey].completionRule;

  if (rule === 'required') {
    return fields[fieldKey].status !== 'provided';
  }

  if (rule === 'projectIdentity') {
    return (
      fields.projectType.status !== 'provided' &&
      fields.objective.status !== 'provided'
    );
  }

  return false;
}
