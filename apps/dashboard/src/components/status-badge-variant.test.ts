import { describe, expect, it } from 'vitest';
import {
  statusBadgeVariant,
  type StatusBadgeTone,
} from './status-badge-variant';

const statusBadgeCases = [
  { tone: 'neutral', variant: 'secondary' },
  { tone: 'info', variant: 'default' },
  { tone: 'warning', variant: 'outline' },
  { tone: 'success', variant: 'default' },
  { tone: 'destructive', variant: 'destructive' },
] as const satisfies readonly {
  tone: StatusBadgeTone;
  variant: ReturnType<typeof statusBadgeVariant>;
}[];

describe('statusBadgeVariant', () => {
  it.each(statusBadgeCases)('maps $tone to $variant', ({ tone, variant }) => {
    expect(statusBadgeVariant(tone)).toBe(variant);
  });
});
