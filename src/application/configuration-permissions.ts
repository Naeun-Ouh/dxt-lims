import type { ConfigurationScope } from '@/src/domain/reference';
export const configurationActions = ['VIEW_CONFIGURATION','AUTHOR_DEFINITION','MANAGE_APPLICABILITY','CREATE_PACKAGE_VERSION','ACTIVATE_PACKAGE_VERSION'] as const;
export type ConfigurationAction = typeof configurationActions[number];
export type ConfigurationScopePermissions = { scope:ConfigurationScope; canViewConfiguration:boolean; canAuthorDefinition:boolean; canManageApplicability:boolean; canCreatePackageVersion:boolean; canActivatePackageVersion:boolean };
export const configurationScopeKey = (scope:ConfigurationScope) => `${scope.kind}:${'ownerId' in scope?scope.ownerId:''}`;
