export type MutationRunner = <Result>(
  operation: () => Promise<Result>,
) => Promise<Result | undefined>;

export type RateItemDialogProps<Item> = {
  item: Item | null;
  open: boolean;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (item: Item, announcement: string) => void;
  runMutation: MutationRunner;
};
