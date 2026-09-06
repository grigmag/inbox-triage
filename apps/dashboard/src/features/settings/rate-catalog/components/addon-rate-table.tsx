import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@inbox-triage/ui';
import type { AddonRateItemDto } from '../dto/addon-rate-item.dto';
import { formatCentsAsEuro } from '../validation/parse-euro-amount-to-cents';
import {
  CatalogActiveControl,
  CatalogEditButton,
  CatalogOrderingControls,
  type RateCatalogTableCallbacks,
} from './rate-catalog-table-controls';

const MODE_LABELS = {
  flat: 'Flat',
  per_day: 'Per day',
  percentage: 'Percentage',
} as const;

type AddonRateTableProps = {
  items: AddonRateItemDto[];
} & RateCatalogTableCallbacks<AddonRateItemDto>;

export function AddonRateTable({
  items,
  pending,
  onActivation,
  onEdit,
  onMove,
}: AddonRateTableProps) {
  return (
    <Table className="min-w-180">
      <TableHeader>
        <TableRow>
          <TableHead>Active</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Mode</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>Order</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item, index) => (
          <TableRow key={item.id} aria-busy={pending || undefined}>
            <TableCell>
              <CatalogActiveControl
                item={item}
                disabled={pending}
                onChange={(active) => onActivation(item, active)}
              />
            </TableCell>
            <TableCell className="font-medium">{item.name}</TableCell>
            <TableCell>{MODE_LABELS[item.pricingMode]}</TableCell>
            <TableCell>
              {item.pricingMode === 'percentage'
                ? `${item.percentage}%`
                : `€${formatCentsAsEuro(item.priceCents)}`}
            </TableCell>
            <TableCell>
              <CatalogOrderingControls
                name={item.name}
                index={index}
                length={items.length}
                disabled={pending}
                onMove={(direction) => onMove(index, direction)}
              />
            </TableCell>
            <TableCell>
              <CatalogEditButton
                disabled={pending}
                onClick={() => onEdit(item)}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
