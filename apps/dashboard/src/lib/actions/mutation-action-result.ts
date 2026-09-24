export type FieldErrors<Field extends string> = Partial<Record<Field, string>>;

/**
 * Result of a validated mutation server action: field-level validation errors,
 * not-found and conflict outcomes, and a success announcement.
 *
 * This is not a general action result. Actions with a different contract, such
 * as mailbox reads, define their own status union with the same `status`
 * names instead of extending this type.
 */
export type MutationActionResult<
  Data,
  Field extends string = string,
  Announcement = string,
> =
  | {
      status: 'success';
      data: Data;
      announcement: Announcement;
    }
  | {
      status: 'validation_error';
      fieldErrors: FieldErrors<Field>;
    }
  | {
      status: 'not_found';
      message: string;
    }
  | {
      status: 'conflict';
      message: string;
      fieldErrors?: FieldErrors<Field>;
    }
  | {
      status: 'failure';
      message: string;
    };
