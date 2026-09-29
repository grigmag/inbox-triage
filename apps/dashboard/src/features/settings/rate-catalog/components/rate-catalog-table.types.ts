/** The callbacks each rate catalog table receives from the panel. */
export type RateCatalogTableCallbacks<Item> = {
  pending: boolean;
  onActivation: (item: Item, isActive: boolean) => void;
  onEdit: (item: Item) => void;
  onMove: (index: number, direction: -1 | 1) => void;
};
