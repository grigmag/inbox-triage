export const RATE_CATALOG_VALIDATION_MESSAGES = {
  catalog: {
    nameRequired: 'Enter a name.',
    nameTooLong: 'Name is too long.',
    duplicateName: 'An item with this name already exists.',
    mode: 'Select a supported pricing mode.',
    money: 'Enter an amount of zero or more.',
    moneyPrecision: 'Use no more than two decimal places.',
    percentage: 'Enter a whole percentage of zero or more.',
    numericRange: 'The value is too large.',
  },
  reorder: {
    empty: 'Provide the complete ordered item list.',
    duplicate: 'Each item can appear only once.',
    invalidId: 'Each item must have a valid ID.',
  },
} as const;
