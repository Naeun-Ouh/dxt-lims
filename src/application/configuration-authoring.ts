import { z } from 'zod';
import { configurationPackageVersionSchema, configurationDefinitionDescriptorSchema, applicabilityRuleSetVersionSchema } from '@/src/domain/reference';
import { ConfigurationManagementCommands, InMemoryConfigurationRepository, type ConfigurationRegistry, type ConfigurationPackageDraft, type AuthoredDefinitionRevision, type ReferenceCatalog } from '@/src/domain/reference';
export const configurationEditorKeys=['NUMBER','TEXT','BOOLEAN','SELECT','REFERENCE'] as const;
export type ConfigurationMutationName=Exclude<keyof ConfigurationManagementCommands,'validatePackageVersion'>;
export type ConfigurationMutation={ [K in ConfigurationMutationName]:{name:K;input:Parameters<ConfigurationManagementCommands[K]>[0]} }[ConfigurationMutationName];
export type ConfigurationAuthoringSnapshot={registry:ConfigurationRegistry;drafts:ConfigurationPackageDraft[];authoredDefinitions:AuthoredDefinitionRevision[];version:number;catalog:ReferenceCatalog;permissions?:import('./configuration-permissions').ConfigurationScopePermissions[];runUsage?:Record<string,number>};
export interface ConfigurationAuthoringBoundary {
  load():Promise<ConfigurationAuthoringSnapshot>;
  execute(request:ConfigurationMutation,commandId:string):Promise<unknown>;
}
/** Transaction candidate hydrated entirely from authoritative storage, never a fallback. */
export function configurationCandidate(snapshot:ConfigurationAuthoringSnapshot) {
  const authored=new Set(snapshot.authoredDefinitions.map(d=>d.descriptor.revisionId));
  const candidate=new InMemoryConfigurationRepository({...snapshot.registry,definitionDescriptors:snapshot.registry.definitionDescriptors.filter(d=>!authored.has(d.revisionId))});
  if(snapshot.drafts.length || snapshot.authoredDefinitions.length)candidate.transact(tx=>{snapshot.drafts.filter(d=>!snapshot.registry.packages.some(p=>p.packageId===d.packageId&&p.version===d.targetVersion)).forEach(d=>tx.addPackageDraft(d));snapshot.authoredDefinitions.forEach(d=>tx.addDefinitionRevision(d));});
  return candidate;
}
export function applyConfigurationMutation(commands:ConfigurationManagementCommands,request:ConfigurationMutation) {
  switch(request.name){
    case 'createDraftPackage':return commands.createDraftPackage(request.input);
    case 'createImmutableDefinitionRevision':return commands.createImmutableDefinitionRevision(request.input);
    case 'createApplicabilityRuleSetVersion':return commands.createApplicabilityRuleSetVersion(request.input);
    case 'assemblePackageVersion':return commands.assemblePackageVersion(request.input);
    case 'activatePackageVersion':return commands.activatePackageVersion(request.input);
    case 'deactivatePackageVersion':return commands.deactivatePackageVersion(request.input);
  }
}

export const configurationMutationSchema=z.discriminatedUnion('name',[
 z.object({name:z.literal('createDraftPackage'),input:z.object({id:z.string().min(1),packageId:z.string().min(1),targetVersion:z.number().int().positive(),scope:configurationPackageVersionSchema.shape.scope})}),
 z.object({name:z.literal('createImmutableDefinitionRevision'),input:z.object({definitionId:z.string().min(1),version:z.number().int().positive(),scope:configurationPackageVersionSchema.shape.scope,descriptor:configurationDefinitionDescriptorSchema})}),
 z.object({name:z.literal('createApplicabilityRuleSetVersion'),input:applicabilityRuleSetVersionSchema}),
 z.object({name:z.literal('assemblePackageVersion'),input:z.object({draftId:z.string().min(1),packageVersionId:z.string().min(1),assembly:configurationPackageVersionSchema.omit({id:true,packageId:true,version:true,scope:true,status:true})})}),
 z.object({name:z.literal('activatePackageVersion'),input:z.string().min(1)}),z.object({name:z.literal('deactivatePackageVersion'),input:z.string().min(1)})
]);
