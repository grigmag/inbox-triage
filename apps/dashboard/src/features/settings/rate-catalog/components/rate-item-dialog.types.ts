export type MutationRun<Result> =
  // Another mutation was already running, so the operation did not start.
  | { outcome: 'skipped' }
  // The operation threw, for example because the request failed in transit.
  | { outcome: 'failed' }
  | { outcome: 'completed'; result: Result };

export type MutationRunner = <Result>(
  operation: () => Promise<Result>,
) => Promise<MutationRun<Result>>;

export type RateItemDialogProps<Item> = {
  item: Item | null;
  open: boolean;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (item: Item, announcement: string) => void;
  runMutation: MutationRunner;
};
