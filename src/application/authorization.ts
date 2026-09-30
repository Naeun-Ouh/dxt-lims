export const authorizationPolicyVersion='organization-discovery-v5' as const;
export const studyActions=['VIEW_STUDY','VIEW_RUN','EDIT_STUDY','EDIT_STUDY_SETUP','CREATE_RUN','EDIT_RUN_PLAN','MANAGE_ACCESS','VIEW_EXECUTION','RECORD_ACTUAL','VIEW_MEASUREMENT','RECORD_MEASUREMENT','MANAGE_MEASUREMENT_VALIDITY','VIEW_EVALUATION','AUTHOR_EVALUATION','VIEW_DECISION','AUTHOR_DECISION','AUTHOR_NEXT_ACTION','MANAGE_REASONING_CONTEXT'] as const;
export type StudyAction=typeof studyActions[number];
export type Principal={principalId:string;userId:string;role:'GENERAL_USER'|'ADMIN'};
export type AuthorizationDecision={effect:'ALLOW'|'DENY';reason:string;principalId:string;action:string;studyId:string;policyVersion:typeof authorizationPolicyVersion;contextVersion:number|null};
export interface AuthorizationService { authorize(principal:Principal,action:StudyAction,studyId:string):Promise<AuthorizationDecision>; }
export type StudyPermissions={canEditStudy:boolean;canEditStudySetup:boolean;canCreateRun:boolean;canEditPlan:boolean;canManageAccess:boolean};

export type ScientificPermissions={canRecordActual:boolean;canRecordMeasurement:boolean;canManageMeasurementValidity:boolean;canEvaluate:boolean;canDecide:boolean;canAuthorNextAction:boolean};
