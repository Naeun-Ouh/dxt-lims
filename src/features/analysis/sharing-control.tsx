'use client';
import { useLocale } from '@/src/shared/i18n/locale';

import {useRef,useState} from 'react';
import type {SavedAnalysisAccess,SavedAnalysisSharing} from '@/src/application/saved-analysis-access';
import type {SavedAnalysisRepository} from '@/src/application/repository-ports';

export function SavedAnalysisSharingControl({id,access,repository,onChanged}:{id:string;access:SavedAnalysisAccess;repository:SavedAnalysisRepository;onChanged:(access:SavedAnalysisAccess)=>void}){
  const { t } = useLocale();
 const [open,setOpen]=useState(false),[draft,setDraft]=useState(access.sharing),[recipient,setRecipient]=useState(''),[kind,setKind]=useState<'PRINCIPAL'|'DEPARTMENT'|'AREA'>('PRINCIPAL');
 const [error,setError]=useState<string|null>(null),[saving,setSaving]=useState(false);
 const pending=useRef<{key:string;commandId:string;expectedVersion:number}|null>(null);
 async function apply(sharing:SavedAnalysisSharing){
  if(!repository.share||!repository.getAccess||!access.canShareSavedAnalysis)return;
  setSaving(true);setError(null);
  const key=JSON.stringify(sharing);
  if(!pending.current||pending.current.key!==key)pending.current={key,commandId:crypto.randomUUID(),expectedVersion:access.version};
  try{await repository.share(id,sharing,pending.current);const next=await repository.getAccess(id);onChanged(next);setDraft(next.sharing);pending.current=null;setOpen(false);}
  catch(e){setError(e instanceof Error?e.message:'Sharing could not be updated.');}
  finally{setSaving(false);}
 }
 return <section className="analysis-save-bar analysis-sharing-bar" aria-label={t("Saved Analysis sharing")}>
  <div><b>{t("Sharing ·")}{" "}{t(access.sharing.visibility)}{access.sharing.audiences.length?t("· {0} explicit recipients", [access.sharing.audiences.length]):''}</b><small>{t("Recipients must also have access to every underlying scientific source.")}</small></div>
  <button className="secondary-button" disabled={!access.canShareSavedAnalysis} onClick={()=>{setDraft(access.sharing);setOpen(!open);}}>{t("Manage sharing")}</button>
  {open&&<div className="analysis-sharing-fields">
   <label>{t("Visibility")}{" "}<select aria-label={t("Saved Analysis visibility")} value={`${draft.visibility}:${draft.targetId??''}`} onChange={e=>{const selected=access.sharingOptions?.find(o=>`${t(o.visibility)}:${o.targetId??''}`===e.target.value);if(selected)setDraft({...selected,audiences:draft.audiences});}}>{access.sharingOptions?.map(o=><option key={`${t(o.visibility)}:${o.targetId}`} value={`${t(o.visibility)}:${o.targetId??''}`}>{t(o.visibility)}{o.targetId?` · ${o.targetId}`:''}</option>)}</select></label>
   <label>{t("Share with")}{" "}<select aria-label={t("Recipient type")} value={kind} onChange={e=>setKind(e.target.value as typeof kind)}><option value="PRINCIPAL">{t("Person")}</option><option value="DEPARTMENT">{t("Department")}</option><option value="AREA">{t("Area")}</option></select></label>
   <input aria-label={t("Recipient ID")} placeholder={t("Recipient ID")} value={recipient} onChange={e=>setRecipient(e.target.value)}/>
   <button disabled={!recipient.trim()||saving} onClick={()=>{if(!draft.audiences.some(a=>a.kind===kind&&a.id===recipient.trim()))setDraft({...draft,audiences:[...draft.audiences,{kind,id:recipient.trim()}]});setRecipient('');}}>{t("Add recipient")}</button>
   {draft.audiences.map(a=><span key={`${a.kind}:${a.id}`}>{a.id} <button aria-label={t("Remove {0}", [a.id])} onClick={()=>setDraft({...draft,audiences:draft.audiences.filter(r=>r!==a)})}>{t("Remove")}</button></span>)}
   <button className="primary-button" disabled={saving} onClick={()=>void apply(draft)}>{t("Save sharing")}</button>
   <button disabled={saving} onClick={()=>void apply({visibility:'PRIVATE',targetId:null,audiences:[]})}>{t("Revoke all sharing")}</button>
   <button disabled={saving} onClick={()=>{pending.current=null;setOpen(false);}}>{t("Cancel")}</button>
  </div>}
  {error&&<p role="alert">{t(error)}{" "}{t("Reload the view if its version has changed.")}</p>}
 </section>;
}
