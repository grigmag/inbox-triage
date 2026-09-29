import type { ReactNode } from 'react';
import { Badge, Checkbox } from '@inbox-triage/ui';
import {
  BRIEF_REVIEW_V1_FIELDS,
  type BriefReviewFieldKey,
} from '@/features/emails/brief-review/brief-review-v1.config';
import type { BriefEvaluationOutput } from '@/features/emails/brief-review/brief-review-v1.schema';
import { useEmailDetail } from '../email-detail-context';
import type { BriefReviewSummary } from './summarize-brief-review';
import { BriefReviewGapBadge } from './brief-review-gap-badge';

type Fields = BriefEvaluationOutput['fields'];
type ProjectTypeCategory = NonNullable<
  Fields['projectType']['value']
>['category'];

const projectTypeLabels: Record<ProjectTypeCategory, string> = {
  photography: 'Photography',
  video: 'Video',
  photography_and_video: 'Photography and video',
  other: 'Other',
};

function hasFieldValue(fields: Fields, fieldKey: BriefReviewFieldKey): boolean {
  const value = fields[fieldKey].value;

  return Array.isArray(value) ? value.length > 0 : value !== null;
}

/** Model-generated content is rendered as React text only, never as Markdown or HTML. */
function FieldValue({
  fields,
  fieldKey,
}: {
  fields: Fields;
  fieldKey: BriefReviewFieldKey;
}) {
  if (fieldKey === 'projectType') {
    const value = fields.projectType.value;

    if (!value) return null;

    return (
      <p>
        {projectTypeLabels[value.category]}

        {value.details && ` — ${value.details}`}
      </p>
    );
  }

  if (fieldKey === 'intendedUse') {
    const value = fields.intendedUse.value;

    if (!value?.length) return null;

    return (
      <ul className="list-disc pl-5">
        {value.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    );
  }

  const value = fields[fieldKey].value;

  return value ? <p className="whitespace-pre-wrap">{value}</p> : null;
}

function DetailsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-medium">{title}</h3>

      {children}
    </section>
  );
}

/**
 * The expanded part of the brief review: gaps, provided details, and the
 * questions, which the user checks to choose what the reply asks.
 */
export function BriefReviewDetails({
  result,
  summary,
}: {
  result: BriefEvaluationOutput;
  summary: BriefReviewSummary;
}) {
  const {
    state: { review, reply },
    actions: { setQuestionChecked },
  } = useEmailDetail();
  const { fields } = result;
  // Locked while a reply is generated or sent, and after it is sent.
  const questionsDisabled = reply.pending !== null || reply.sent !== null;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground">{result.outcomeReason}</p>

      {summary.gaps.length > 0 && (
        <DetailsSection title="Needs attention">
          <ul className="flex flex-col divide-y rounded-lg border">
            {summary.gaps.map((fieldKey) => {
              const field = fields[fieldKey];

              if (field.status === 'provided') return null;

              return (
                <li key={fieldKey} className="flex flex-col gap-1.5 p-3">
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-medium">
                      {BRIEF_REVIEW_V1_FIELDS[fieldKey].label}
                    </span>

                    <BriefReviewGapBadge status={field.status} />
                  </div>

                  {hasFieldValue(fields, fieldKey) ? (
                    <FieldValue fields={fields} fieldKey={fieldKey} />
                  ) : (
                    <p className="text-muted-foreground italic">
                      Not mentioned
                    </p>
                  )}

                  {field.reason && (
                    <p className="text-muted-foreground">{field.reason}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </DetailsSection>
      )}

      {summary.provided.length > 0 && (
        <DetailsSection title="Provided">
          <div className="@container">
            <dl className="grid gap-y-3 @sm:grid-cols-[max-content_minmax(0,1fr)] @sm:gap-x-4 @sm:gap-y-2">
              {summary.provided.map((fieldKey) => (
                <div
                  key={fieldKey}
                  className="flex flex-col gap-0.5 @sm:col-span-2 @sm:grid @sm:grid-cols-subgrid"
                >
                  <dt className="text-muted-foreground">
                    {BRIEF_REVIEW_V1_FIELDS[fieldKey].label}
                  </dt>

                  <dd>
                    <FieldValue fields={fields} fieldKey={fieldKey} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </DetailsSection>
      )}

      {result.missingInformation.length > 0 && (
        <DetailsSection title="Questions the reply will ask">
          <ul className="flex flex-col gap-3">
            {result.missingInformation.map((item, index) => (
              <li key={index}>
                {/* Badges keep their own height and align with the first
                    line, because the text line height matches the badge
                    height. The badge is part of the label, so it is read
                    with the question. */}
                <label className="flex cursor-pointer items-start gap-3 has-data-disabled:cursor-not-allowed has-data-unchecked:text-muted-foreground">
                  <Checkbox
                    className="mt-0.5"
                    checked={review.selectedQuestionIndices.includes(index)}
                    onCheckedChange={(checked) =>
                      setQuestionChecked(index, checked)
                    }
                    disabled={questionsDisabled}
                  />

                  <span className="min-w-0 flex-1">{item.question}</span>

                  {item.blocksCompletion ? (
                    <Badge variant="destructive">Blocking</Badge>
                  ) : (
                    <Badge variant="outline">Optional</Badge>
                  )}
                </label>
              </li>
            ))}
          </ul>
        </DetailsSection>
      )}
    </div>
  );
}
