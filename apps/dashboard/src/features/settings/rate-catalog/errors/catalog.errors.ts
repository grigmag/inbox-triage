export class CatalogNameConflictError extends Error {
  constructor() {
    super('Catalog item name already exists.');
    this.name = 'CatalogNameConflictError';
  }
}

export class CatalogItemNotFoundError extends Error {
  constructor() {
    super('Catalog item was not found.');
    this.name = 'CatalogItemNotFoundError';
  }
}
