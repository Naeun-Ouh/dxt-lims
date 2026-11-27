import type { OperationDesign, OperationGroup } from './operation-design';

/** QA-01: numbering is a projection of order, never a Group identity or stored counter. */
export function operationGroupTitle(
  design: Pick<OperationDesign, 'groups'> | undefined,
  groupId: string,
): string | undefined {
  let split = 0;
  for (const group of design?.groups ?? []) {
    if (group.kind === 'SPLIT') split += 1;
    if (group.id === groupId) return group.kind === 'BASE' ? 'Base' : `Split ${split}`;
  }
  return undefined;
}

/** Existing auto-generated names remain stored unchanged; custom names are descriptions. */
export function operationGroupDescription(group: OperationGroup): string {
  const name = group.name.trim();
  const generated = group.kind === 'BASE' ? /^Base$/ : /^Split(?:\s+\d+)?$/;
  return generated.test(name) ? '' : group.name;
}

export function operationGroupLabel(
  design: Pick<OperationDesign, 'groups'> | undefined,
  groupId: string,
): string | undefined {
  const group = design?.groups.find((item) => item.id === groupId);
  if (!group) return undefined;
  const title = operationGroupTitle(design, groupId);
  const description = operationGroupDescription(group).trim();
  return description ? `${title} · ${description}` : title;
}
