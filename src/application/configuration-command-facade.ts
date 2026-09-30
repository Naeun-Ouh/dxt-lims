import { ConfigurationManagementCommands } from '@/src/domain/reference';
import { HydratedConfiguration } from './hydrated-configuration';
import { configurationEditorKeys, type ConfigurationAuthoringSnapshot,type ConfigurationMutation } from './configuration-authoring';
import type { DxtApplication } from './dxt-application';
export class AuthoringRuntimeConfiguration extends HydratedConfiguration {
  readonly referenceCatalog;
  readonly runUsage;
  get permissions(){return this.snapshot.permissions??[];}
  constructor(private readonly snapshot:ConfigurationAuthoringSnapshot){super(snapshot.registry);this.referenceCatalog=snapshot.catalog;this.runUsage=snapshot.runUsage??{};}
  override getRevision(){return this.snapshot.version;}
  override getPackageDraft(id:string){return structuredClone(this.snapshot.drafts.find(d=>d.id===id));}
  override getDefinitionRevision(id:string){return structuredClone(this.snapshot.authoredDefinitions.find(d=>d.descriptor.revisionId===id));}
}
export type ConfigurationCommandFacade={ [K in keyof ConfigurationManagementCommands]: (...args:Parameters<ConfigurationManagementCommands[K]>)=>ReturnType<ConfigurationManagementCommands[K]>|Promise<ReturnType<ConfigurationManagementCommands[K]>> };
export function productionConfigurationCommands(application:DxtApplication):ConfigurationCommandFacade {
  const pending=new Map<string,string>();
  const execute=async(request:ConfigurationMutation)=>{
    const encoded=JSON.stringify(request);
    const commandId=pending.get(encoded)??crypto.randomUUID();
    pending.set(encoded,commandId);
    const result=await application.configurationAuthoringBoundary!.execute(request,commandId);
    application.repositories.configuration=new AuthoringRuntimeConfiguration(await application.configurationAuthoringBoundary!.load());
    pending.delete(encoded);
    return result;
  };
  return {
    createDraftPackage:input=>execute({name:'createDraftPackage',input}) as Promise<ReturnType<ConfigurationManagementCommands['createDraftPackage']>>,
    createImmutableDefinitionRevision:input=>execute({name:'createImmutableDefinitionRevision',input}) as Promise<ReturnType<ConfigurationManagementCommands['createImmutableDefinitionRevision']>>,
    createApplicabilityRuleSetVersion:input=>execute({name:'createApplicabilityRuleSetVersion',input}) as Promise<ReturnType<ConfigurationManagementCommands['createApplicabilityRuleSetVersion']>>,
    assemblePackageVersion:input=>execute({name:'assemblePackageVersion',input}) as Promise<ReturnType<ConfigurationManagementCommands['assemblePackageVersion']>>,
    activatePackageVersion:input=>execute({name:'activatePackageVersion',input}) as Promise<ReturnType<ConfigurationManagementCommands['activatePackageVersion']>>,
    deactivatePackageVersion:input=>execute({name:'deactivatePackageVersion',input}) as Promise<ReturnType<ConfigurationManagementCommands['deactivatePackageVersion']>>,
    validatePackageVersion:id=>new ConfigurationManagementCommands(application.repositories.configuration,(application.repositories.configuration as AuthoringRuntimeConfiguration).referenceCatalog,configurationEditorKeys).validatePackageVersion(id),
  };
}
