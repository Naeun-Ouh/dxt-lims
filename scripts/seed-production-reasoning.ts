/** Explicit local development definitions, no Evaluation/Decision observation seeds. */
import {PgDatabase} from '../src/infrastructure/postgres/pg-database';
import {provisionReasoningContexts} from '../src/infrastructure/postgres/reasoning-context';
import {lifecycleAuthoringProfiles} from '../src/mock/lifecycle-authoring';
const db=PgDatabase.fromEnvironment();
try{await db.transaction(sql=>provisionReasoningContexts(sql,lifecycleAuthoringProfiles));}finally{await db.close();}
