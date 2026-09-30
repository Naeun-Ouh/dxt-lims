import { z } from 'zod';
export const savedAnalysisActions=['VIEW_SAVED_ANALYSIS','EDIT_SAVED_ANALYSIS','SHARE_SAVED_ANALYSIS','DELETE_SAVED_ANALYSIS','MANAGE_SAVED_ANALYSIS_ACCESS'] as const;
export type SavedAnalysisAction=typeof savedAnalysisActions[number];
const id=z.string().min(1);
export const savedAnalysisAudienceSchema=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('PRINCIPAL'),id}),z.object({kind:z.literal('DEPARTMENT'),id}),z.object({kind:z.literal('AREA'),id}),
]);
export const savedAnalysisSharingSchema=z.object({visibility:z.enum(['PRIVATE','STUDY','DEPARTMENT','AREA']),targetId:id.nullable(),audiences:z.array(savedAnalysisAudienceSchema).max(100)}).superRefine((a,ctx)=>{if((a.visibility==='PRIVATE')!==(a.targetId===null))ctx.addIssue({code:'custom',message:'Choose an exact sharing audience.'});});
export type SavedAnalysisSharing=z.infer<typeof savedAnalysisSharingSchema>;
export type SavedAnalysisAccess={sharingOptions?:SavedAnalysisSharing[];version:number;ownerPrincipalId:string;sharing:SavedAnalysisSharing;canEditSavedAnalysis:boolean;canShareSavedAnalysis:boolean;canDeleteSavedAnalysis:boolean;canManageSavedAnalysisAccess:boolean};
export type SavedAnalysisAccessCommand={commandId:string;expectedVersion:number};
export type SavedAnalysisAuditMetadata={actor:string;savedAnalysisId:string;action:string;audience:SavedAnalysisSharing;result:'ALLOW';reason:string;version:number};
