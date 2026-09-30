import { definitions } from '@/src/mock/reference';
export const referenceCatalog = definitions;
export const slug = (code: string) => code.toLowerCase().replaceAll('_', '-');
export const experimentTypeBySlug = (value: string) =>
  definitions.experimentTypes.find(
    (type) => slug(type.code) === value.toLowerCase(),
  );
export const areaByCode = (code: string) =>
  definitions.areas.find((area) => area.code === code.toUpperCase());
export const conditionBySlug = (value: string) =>
  definitions.conditions.find(
    (condition) => slug(condition.code) === value.toLowerCase(),
  );
export const measurementOperationBySlug = (value: string) =>
  definitions.measurementOperations.find(
    (operation) => slug(operation.code) === value.toLowerCase(),
  );
export const unit = (unitId: string | null) =>
  unitId
    ? (definitions.units.find((item) => item.id === unitId)?.symbol ?? '—')
    : '—';
