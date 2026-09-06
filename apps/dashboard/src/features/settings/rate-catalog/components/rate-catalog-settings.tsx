'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@inbox-triage/ui';
import { useRateCatalogEditor } from '../hooks/use-rate-catalog-editor';
import type { AdminCatalogLists } from '../repositories/rate-catalog.repository';
import { AddonRateTable } from './addon-rate-table';
import { CrewRateTable } from './crew-rate-table';
import { DeliverableRateTable } from './deliverable-rate-table';
import { RateCatalogDialog } from './rate-catalog-dialog';
import { RateCatalogPanel } from './rate-catalog-panel';

export function RateCatalogSettings({
  initialCatalogs,
}: {
  initialCatalogs: AdminCatalogLists;
}) {
  const editor = useRateCatalogEditor(initialCatalogs);
  const { crew, deliverables, addons } = editor.catalogs;

  return (
    <>
      <p className="sr-only" aria-live="polite">
        {editor.announcement}
      </p>
      <Tabs defaultValue="crew">
        <TabsList aria-label="Rate catalogs">
          <TabsTrigger value="crew">Crew</TabsTrigger>
          <TabsTrigger value="deliverables">Deliverables</TabsTrigger>
          <TabsTrigger value="addons">Add-ons</TabsTrigger>
        </TabsList>

        <TabsContent value="crew">
          <RateCatalogPanel
            title="Crew Day Rates"
            description="Daily rates for production roles used in new estimates."
            addLabel="Add crew role"
            emptyTitle="No crew roles yet"
            emptyDescription="Add a crew role to start building your rates."
            zeroActiveMessage="No crew roles are currently available to new estimates."
            items={crew}
            disabled={editor.pending}
            onAdd={() => editor.openDialog({ catalog: 'crew', item: null })}
          >
            <CrewRateTable
              items={crew}
              pending={editor.pending}
              onActivation={(item, active) =>
                void editor.setActive('crew', item, active)
              }
              onEdit={(item) => editor.openDialog({ catalog: 'crew', item })}
              onMove={(index, direction) =>
                void editor.move('crew', crew, index, direction)
              }
            />
          </RateCatalogPanel>
        </TabsContent>

        <TabsContent value="deliverables">
          <RateCatalogPanel
            title="Deliverable Pricing"
            description="Charge deliverables per item or per started group of 30."
            addLabel="Add deliverable"
            emptyTitle="No deliverables yet"
            emptyDescription="Add a deliverable to start building your rates."
            zeroActiveMessage="No deliverables are currently available to new estimates."
            items={deliverables}
            disabled={editor.pending}
            onAdd={() =>
              editor.openDialog({ catalog: 'deliverable', item: null })
            }
          >
            <DeliverableRateTable
              items={deliverables}
              pending={editor.pending}
              onActivation={(item, active) =>
                void editor.setActive('deliverable', item, active)
              }
              onEdit={(item) =>
                editor.openDialog({ catalog: 'deliverable', item })
              }
              onMove={(index, direction) =>
                void editor.move('deliverable', deliverables, index, direction)
              }
            />
          </RateCatalogPanel>
        </TabsContent>

        <TabsContent value="addons">
          <RateCatalogPanel
            title="Add-ons & Extras"
            description="Configure flat, daily, or percentage-based extras."
            addLabel="Add add-on"
            emptyTitle="No add-ons yet"
            emptyDescription="Add an add-on to start building your rates."
            zeroActiveMessage="No add-ons are currently available to new estimates."
            items={addons}
            disabled={editor.pending}
            onAdd={() => editor.openDialog({ catalog: 'addon', item: null })}
          >
            <AddonRateTable
              items={addons}
              pending={editor.pending}
              onActivation={(item, active) =>
                void editor.setActive('addon', item, active)
              }
              onEdit={(item) => editor.openDialog({ catalog: 'addon', item })}
              onMove={(index, direction) =>
                void editor.move('addon', addons, index, direction)
              }
            />
          </RateCatalogPanel>
        </TabsContent>
      </Tabs>

      <RateCatalogDialog
        dialog={editor.dialog}
        pending={editor.pending}
        runMutation={editor.runMutation}
        onClose={editor.closeDialog}
        onCrewSaved={editor.saveCrew}
        onDeliverableSaved={editor.saveDeliverable}
        onAddonSaved={editor.saveAddon}
      />
    </>
  );
}
