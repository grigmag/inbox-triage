import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@inbox-triage/ui';
import type { CrewRateItemDto } from '../dto/crew-rate-item.dto';
import { formatCentsAsEuro } from '../validation/parse-euro-amount-to-cents';
import {
  CatalogActiveControl,
  CatalogEditButton,
  CatalogOrderingControls,
  type RateCatalogTableCallbacks,
} from './rate-catalog-table-controls';

type CrewRateTableProps = {
  items: CrewRateItemDto[];
} & RateCatalogTableCallbacks<CrewRateItemDto>;

export function CrewRateTable({
  items,
  pending,
  onActivation,
  onEdit,
  onMove,
}: CrewRateTableProps) {
  return (
    <Table className="min-w-155">
      <TableHeader>
        <TableRow>
          <TableHead>Active</TableHead>

          <TableHead>Role</TableHead>

          <TableHead>Day Rate (€)</TableHead>

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

            <TableCell>€{formatCentsAsEuro(item.dayRateCents)}</TableCell>

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
