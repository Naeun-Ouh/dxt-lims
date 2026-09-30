import { notFound } from 'next/navigation';
import { getContext } from '@/src/mock/experiments';
import DataPreparationWorkspace from '@/src/features/data-preparation/workspace';
export default async function Page({params}:{params:Promise<{runId:string}>}) { const {runId}=await params,context=/^[1-4]$/.test(runId)?getContext(Number(runId)):undefined;if(!context)notFound();return <DataPreparationWorkspace context={context}/> }
