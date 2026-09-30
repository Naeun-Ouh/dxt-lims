import { PgDatabase } from './pg-database';
import { authorizedOperation } from './authorized-application';
import { developmentPrincipalId } from './authorization';
import type { DxtApplication } from '@/src/application/dxt-application';
let database:PgDatabase|undefined;
export async function productionRequest(input:Record<string,unknown>,dispatch:(app:DxtApplication,input:Record<string,unknown>)=>Promise<unknown>=async()=>null){
 if(process.env.DXT_REPOSITORY!=='postgres')throw new Error('Production repository is not enabled.');
 const principalId=developmentPrincipalId();
 database??=PgDatabase.fromEnvironment();
 return authorizedOperation(database,principalId,input,dispatch);
}
