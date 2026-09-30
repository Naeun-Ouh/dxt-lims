import { z } from 'zod';
import { idSchema, typedValueSchema } from '../reference';

export const configurationProvenanceSchema = z.enum([
  'SERIES_DEFAULT',
  'PREVIOUS_RUN',
  'RUN_OVERRIDE',
  'AD_HOC',
  'LOADED_FROM_EXISTING',
]);

export const configurationItemSchema = z.object({
  id: idSchema,
  kind: z.enum([
    'OPERATION',
    'RECIPE',
    'CONDITION',
    'MATERIAL',
    'MEASUREMENT',
    'EVALUATION_CRITERION',
    'RESOURCE',
  ]),
  label: z.string().min(1),
  referenceRevisionId: idSchema.nullable(),
  value: typedValueSchema.nullable(),
  unit: z.string().nullable(),
  provenance: configurationProvenanceSchema,
  state: z.enum(['INHERITED', 'MODIFIED', 'ADDED', 'REMOVED']),
  semanticCategory: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }).nullable(),
});

export const experimentConfigurationSnapshotSchema = z.object({
  id: idSchema,
  sourceId: idSchema.nullable(),
  sourceKind: z.enum(['SERIES_DEFAULT', 'PREVIOUS_RUN', 'EXISTING']).nullable(),
  areaDefinitionRevisionId: idSchema.nullable(),
  items: z.array(configurationItemSchema),
});

export type ConfigurationItem = z.infer<typeof configurationItemSchema>;
export type ExperimentConfigurationSnapshot = z.infer<
  typeof experimentConfigurationSnapshotSchema
>;

const copy = <T>(value: T): T => structuredClone(value);

/** Materializes independent full snapshots. Source objects are never mutated or
 * dynamically re-resolved, so exact reference revision identities remain stable. */
export const ExperimentConfigurationResolver = {
  fromSeriesDefault(
    seriesDefault: ExperimentConfigurationSnapshot,
    runSnapshotId: string,
  ): ExperimentConfigurationSnapshot {
    return {
      ...copy(seriesDefault),
      id: runSnapshotId,
      sourceId: seriesDefault.id,
      sourceKind: 'SERIES_DEFAULT',
      items: seriesDefault.items.map((item) => ({
        ...copy(item),
        provenance: 'SERIES_DEFAULT',
        state: 'INHERITED',
      })),
    };
  },

  fromPreviousRun(
    previous: ExperimentConfigurationSnapshot,
    runSnapshotId: string,
  ): ExperimentConfigurationSnapshot {
    return {
      ...copy(previous),
      id: runSnapshotId,
      sourceId: previous.id,
      sourceKind: 'PREVIOUS_RUN',
      items: previous.items.map((item) => ({
        ...copy(item),
        provenance: 'PREVIOUS_RUN',
        state: 'INHERITED',
      })),
    };
  },

  loadFromExisting(
    existing: ExperimentConfigurationSnapshot,
    runSnapshotId: string,
  ): ExperimentConfigurationSnapshot {
    return {
      ...copy(existing),
      id: runSnapshotId,
      sourceId: existing.id,
      sourceKind: 'EXISTING',
      items: existing.items.map((item) => ({
        ...copy(item),
        provenance: 'LOADED_FROM_EXISTING',
        state: 'INHERITED',
      })),
    };
  },

  override(
    snapshot: ExperimentConfigurationSnapshot,
    itemId: string,
    value: ConfigurationItem['value'],
  ): ExperimentConfigurationSnapshot {
    return {
      ...copy(snapshot),
      items: snapshot.items.map((item) =>
        item.id === itemId
          ? {
              ...copy(item),
              value: copy(value),
              provenance: 'RUN_OVERRIDE',
              state: 'MODIFIED',
            }
          : copy(item),
      ),
    };
  },

  addAdHoc(
    snapshot: ExperimentConfigurationSnapshot,
    item: Omit<
      ConfigurationItem,
      'provenance' | 'state' | 'referenceRevisionId'
    >,
  ): ExperimentConfigurationSnapshot {
    return {
      ...copy(snapshot),
      items: [
        ...snapshot.items.map(copy),
        {
          ...copy(item),
          referenceRevisionId: null,
          provenance: 'AD_HOC',
          state: 'ADDED',
        },
      ],
    };
  },
};

export type ConfigurationGuidance = {
  level: 'INFO' | 'WARNING' | 'BLOCKING';
  message: string;
};

export function configurationGuidance(
  snapshot: ExperimentConfigurationSnapshot,
): ConfigurationGuidance[] {
  return snapshot.items.flatMap<ConfigurationGuidance>((item) => {
    if (item.provenance === 'AD_HOC')
      return [
        {
          level: 'INFO' as const,
          message: `${item.label} is ad-hoc and is not registered in Reference Studio.`,
        },
      ];
    if (item.kind === 'MEASUREMENT' && item.value && !item.unit)
      return [
        { level: 'WARNING' as const, message: `${item.label} has no unit.` },
      ];
    return [];
  });
}
