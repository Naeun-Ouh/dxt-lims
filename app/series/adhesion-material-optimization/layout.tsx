import { LocalizedText } from '@/src/shared/i18n/text';
import { productionRequest } from '@/src/infrastructure/postgres/server-composition';
export default async function Layout({children}:{children:React.ReactNode}){
 if(process.env.DXT_REPOSITORY==='postgres'){try{await productionRequest({operation:'study.permissions',slug:'adhesion-material-optimization'});}catch{return <main role="alert"><LocalizedText>Resource unavailable or access denied.</LocalizedText></main>;}}
 return children;
}
