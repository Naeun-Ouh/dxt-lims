import { redirect } from 'next/navigation';
import RunPlanner from '@/src/features/run-registration/planner';
import { planningWorkspaceScenarios } from '@/src/mock/planning-workspace-scenarios';
export default function Page() {
  if (process.env.DXT_REPOSITORY === 'postgres') redirect('/series/cmp-stability/runs/12/engineering-grid');
  return <RunPlanner scenario={planningWorkspaceScenarios.CMP} />;
}
