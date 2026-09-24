'use client';

import { useId, useState, type ComponentProps } from 'react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
  Spinner,
} from '@inbox-triage/ui';
import {
  BRIEF_REVIEW_V1_FIELD_KEYS,
  BRIEF_REVIEW_V1_FIELDS,
  type BriefReviewFieldKey,
} from '../brief-review/brief-review-v1.config';
import type { BriefEvaluationOutput } from '../brief-review/brief-review-v1.schema';

type Fields = BriefEvaluationOutput['fields'];
type FieldStatus = Fields[BriefReviewFieldKey]['status'];
type ProjectTypeCategory = NonNullable<
  Fields['projectType']['value']
>['category'];

const outcomeTitles: Record<BriefEvaluationOutput['outcome'], string> = {
  irrelevant: 'Not a production brief',
  needs_information: 'Needs information',
  complete: 'Brief sufficiently complete',
};

const statusLabels: Record<FieldStatus, string> = {
  provided: 'Provided',
  missing: 'Missing',
  ambiguous: 'Ambiguous',
};

const warningBadgeClassName =
  'border-transparent bg-warning/10 text-warning dark:bg-warning/20';

const statusBadgeProps: Record<FieldStatus, ComponentProps<typeof Badge>> = {
  provided: { variant: 'secondary' },
  missing: { variant: 'outline', className: warningBadgeClassName },
  ambiguous: { variant: 'outline', className: warningBadgeClassName },
};

const projectTypeLabels: Record<ProjectTypeCategory, string> = {
  photography: 'Photography',
  video: 'Video',
  photography_and_video: 'Photography and video',
  other: 'Other',
};

// Model-generated content is rendered as React text only, never as Markdown or HTML.
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

export function EmailReviewPanel({
  result,
  error,
  loading,
  unavailableReason,
  onReview,
}: {
  result: BriefEvaluationOutput | null;
  error: string | null;
  loading: boolean;
  unavailableReason: string | null;
  onReview: () => void;
}) {
  const [detailsHidden, setDetailsHidden] = useState(false);
  const detailsId = useId();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brief review</CardTitle>

        {!result && (
          <CardDescription>
            {unavailableReason ??
              'Check whether this email is a complete production brief.'}
          </CardDescription>
        )}

        <CardAction>
          <Button
            onClick={onReview}
            disabled={loading || unavailableReason !== null}
          >
            {loading && <Spinner data-icon="inline-start" />}

            {result ? 'Review again' : 'Review email'}
          </Button>
        </CardAction>
      </CardHeader>

      {(error || result || loading) && (
        <CardContent className="flex flex-col gap-6 text-sm wrap-anywhere">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading && !result && (
            <div
              role="status"
              aria-label="Reviewing email"
              className="flex flex-col gap-3"
            >
              <Skeleton className="h-5 w-1/3" />

              <Skeleton className="h-4 w-full" />

              <Skeleton className="h-16 w-full" />
            </div>
          )}

          {result && (
            <>
              <div className="flex flex-col gap-1">
                <h3 className="text-base font-medium">
                  {outcomeTitles[result.outcome]}
                </h3>

                <p className="text-muted-foreground">{result.outcomeReason}</p>
              </div>

              <p className="leading-relaxed">{result.summary}</p>

              {result.outcome !== 'irrelevant' && (
                <>
                  <div>
                    <Button
                      variant="outline"
                      aria-expanded={!detailsHidden}
                      aria-controls={detailsId}
                      onClick={() => setDetailsHidden((hidden) => !hidden)}
                    >
                      {detailsHidden ? 'Show details' : 'Hide details'}
                    </Button>
                  </div>

                  <div
                    id={detailsId}
                    hidden={detailsHidden}
                    className="flex flex-col gap-6"
                  >
                    <dl className="flex flex-col gap-4">
                      {BRIEF_REVIEW_V1_FIELD_KEYS.map((fieldKey) => {
                        const field = result.fields[fieldKey];

                        return (
                          <div key={fieldKey} className="flex flex-col gap-1">
                            <dt className="flex items-center gap-2 font-medium">
                              {BRIEF_REVIEW_V1_FIELDS[fieldKey].label}

                              <Badge {...statusBadgeProps[field.status]}>
                                {statusLabels[field.status]}
                              </Badge>
                            </dt>

                            <dd className="flex flex-col gap-1">
                              <FieldValue
                                fields={result.fields}
                                fieldKey={fieldKey}
                              />

                              {field.reason && (
                                <p className="text-muted-foreground">
                                  {field.reason}
                                </p>
                              )}
                            </dd>
                          </div>
                        );
                      })}
                    </dl>

                    {result.missingInformation.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <h3 className="font-medium">Questions to clarify</h3>

                        <ul className="flex flex-col gap-2">
                          {result.missingInformation.map((item, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="flex-1">{item.question}</span>

                              <Badge
                                variant={
                                  item.blocksCompletion
                                    ? 'destructive'
                                    : 'outline'
                                }
                              >
                                {item.blocksCompletion
                                  ? 'Blocking'
                                  : 'Optional'}
                              </Badge>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
