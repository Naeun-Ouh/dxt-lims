import Link from 'next/link';
import { ArrowLeft, Check, GitBranch } from 'lucide-react';
import { previousContext } from '@/src/mock/experiments';
import type { ExperimentContext } from '@/src/domain/experiment';
import {
  evaluationRows,
  criterionRows,
} from '@/src/domain/decision/presentation';
import { ExperimentConditions } from './conditions';
import { Badge, seriesPath, Workspace } from '@/src/shared/ui/workspace';
import { EvidenceGallery, NextRun } from './interactions';
import { ExecutionContextView } from './execution-context';
import { MeasurementResults } from './measurement-results';
export default function ExperimentRun({
  context: c,
}: {
  context: ExperimentContext;
}) {
  const n = c.run.runNumber,
    previous = previousContext(c),
    series = c.series;
  const evaluations = evaluationRows(c),
    criteria = criterionRows(c);
  return (
    <Workspace page="Run" run={n}>
      <div className="run-heading">
        <div>
          <Link href={seriesPath} className="back-link">
            <ArrowLeft size={14} /> Study Overview
          </Link>
          <h1>
            {series.title}
            <span className="title-slash">/</span>
            <span className="run-title">Run #{n}</span>
          </h1>
          <div className="run-meta">
            <Badge tone="green">
              <Check size={11} />
              {c.run.status}
            </Badge>
            <span>{series.owner}</span>
            <span>
              Started {c.run.startedAt?.slice(0, 10)} ·{' '}
              {c.run.startedAt?.slice(11, 16)}
            </span>
            <span>
              Completed {c.run.completedAt?.slice(0, 10)} ·{' '}
              {c.run.completedAt?.slice(11, 16)} KST
            </span>
          </div>
        </div>
      </div>
      <div className="objective">
        <span className="small-label">INTENT</span>
        <div>
          <p>{c.intent.purpose ?? 'Purpose not recorded'}</p>
          {c.intent.hypothesis && (
            <p className="intent-hypothesis">
              Hypothesis · {c.intent.hypothesis}
            </p>
          )}
        </div>
        {c.intent.targets.length > 0 && (
          <div className="intent-targets">
            <span className="small-label">TARGET</span>
            {c.intent.targets.map((target) => (
              <span key={target.id}>{target.statement}</span>
            ))}
          </div>
        )}
        <span className="objective-mark">
          <GitBranch size={17} />
        </span>
      </div>
      <div className="run-canvas">
        <section className="canvas-section">
          <div className="canvas-label">
            <span>01</span>
            <h2>What changed</h2>
            <p>
              {previous
                ? `Compared with Run #${previous.run.runNumber}`
                : 'Initial condition set'}
            </p>
          </div>
          <div className="canvas-content">
            <ExperimentConditions context={c} previous={previous} />
          </div>
        </section>
        <section className="canvas-section">
          <div className="canvas-label">
            <span>02</span>
            <h2>Execution</h2>
            <p>Actual process context</p>
          </div>
          <div className="canvas-content">
            <ExecutionContextView context={c} />
          </div>
        </section>
        <section className="canvas-section" id="measurement-results">
          <div className="canvas-label">
            <span>03</span>
            <h2>Measurements</h2>
            <p>What happened</p>
            <Badge>RESULT</Badge>
          </div>
          <div className="canvas-content">
            <MeasurementResults context={c} previous={previous} />
          </div>
        </section>
        <section className="canvas-section">
          <div className="canvas-label">
            <span>04</span>
            <h2>Evidence</h2>
            <p>Behind the result</p>
          </div>
          <div className="canvas-content">
            <EvidenceGallery context={c} />
          </div>
        </section>
        <section className="canvas-section decision-section">
          <div className="canvas-label">
            <span>05</span>
            <h2>Decision</h2>
            <p>Engineer judgment</p>
          </div>
          <div className="canvas-content">
            {c.decision && (
              <>
                <div className="decision-heading">
                  <span className="small-label">ENGINEER EVALUATION</span>
                  {evaluations.map((evaluation) => (
                    <Badge key={evaluation.id} tone={evaluation.tone}>
                      {evaluation.value} {evaluation.unit}
                    </Badge>
                  ))}
                  <span>Recorded by {c.decision.recordedBy}</span>
                </div>
                <h3 className="conclusion">{c.decision.conclusion}</h3>
                <div className="criteria-summary">
                  <span className="small-label">EVALUATION CRITERIA</span>
                  <div>
                    {criteria.map((criterion) => (
                      <span key={criterion.id} className="criterion-row">
                        <span>
                          {criterion.name} {criterion.rule}
                        </span>
                        <strong>{criterion.observed}</strong>
                        <Badge
                          tone={
                            criterion.status === 'PASS'
                              ? 'green'
                              : criterion.status === 'FAIL'
                                ? 'red'
                                : 'neutral'
                          }
                        >
                          {criterion.status.replace('_', ' ')}
                        </Badge>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="decision-reason">
                  <span className="small-label">REASON</span>
                  <p>{c.decision.reason}</p>
                </div>
                <div className="next-action">
                  <div>
                    <span className="small-label">NEXT ACTION</span>
                    <p>{c.decision.nextAction?.note}</p>
                  </div>
                  <NextRun context={c} />
                </div>
              </>
            )}
          </div>
        </section>
      </div>
      <div className="run-bottom">
        <Link href={seriesPath} className="text-link">
          <ArrowLeft size={14} /> Back to Study
        </Link>
        <span>Conditions → execution → evidence → decision</span>
      </div>
    </Workspace>
  );
}
