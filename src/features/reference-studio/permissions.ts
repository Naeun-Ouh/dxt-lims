import type { DxtApplication } from '@/src/application/dxt-application';
import { AuthoringRuntimeConfiguration } from '@/src/application/configuration-command-facade';
import { configurationScopeKey, type ConfigurationScopePermissions } from '@/src/application/configuration-permissions';
import type { ConfigurationScope } from '@/src/domain/reference';
export function governedScopes(application:DxtApplication){
 const repository=application.repositories.configuration;
 return repository instanceof AuthoringRuntimeConfiguration?repository.permissions:[];
}
export function canGovern(application:DxtApplication,action:Exclude<keyof ConfigurationScopePermissions,'scope'>,scope?:ConfigurationScope){
 if(!application.configurationAuthoringBoundary)return true; // Explicit browser prototype adapter only.
 return governedScopes(application).some(p=>p[action]&&(!scope||configurationScopeKey(p.scope)===configurationScopeKey(scope)));
}
