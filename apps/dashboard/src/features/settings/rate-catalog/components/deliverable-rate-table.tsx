import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@inbox-triage/ui';
import type { DeliverableRateItemDto } from '../dto/deliverable-rate-item.dto';
import { formatCentsAsEuro } from '../validation/parse-euro-amount-to-cents';
import {
  CatalogActiveControl,
  CatalogEditButton,
  CatalogOrderingControls,
  type RateCatalogTableCallbacks,
} from './rate-catalog-table-controls';

type DeliverableRateTableProps = {
  items: DeliverableRateItemDto[];
} & RateCatalogTableCallbacks<DeliverableRateItemDto>;

export function DeliverableRateTable({
  items,
  pending,
  onActivation,
  onEdit,
  onMove,
}: DeliverableRateTableProps) {
  return (
    <Table className="min-w-180">
      <TableHeader>
        <TableRow>
          <TableHead>Active</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Mode</TableHead>
          <TableHead>Unit Price (€)</TableHead>
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
            <TableCell>
              {item.pricingMode === 'per_unit' ? 'Per unit' : 'Per 30'}
            </TableCell>
            <TableCell>€{formatCentsAsEuro(item.unitPriceCents)}</TableCell>
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
