export type FieldErrors<Field extends string> = Partial<Record<Field, string>>;

export type ActionResult<
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
