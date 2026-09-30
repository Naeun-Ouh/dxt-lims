import { LocalizedText } from '@/src/shared/i18n/text';
import { productionRequest } from '@/src/infrastructure/postgres/server-composition';
export default async function Layout({children,params}:{children:React.ReactNode;params:Promise<{seriesSlug:string}>}){
 if(process.env.DXT_REPOSITORY==='postgres'){try{await productionRequest({operation:'study.permissions',slug:(await params).seriesSlug});}catch{return <main role="alert"><LocalizedText>Resource unavailable or access denied.</LocalizedText></main>;}}
 return children;
}
