'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, Copy, FileText, Maximize2 } from 'lucide-react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  type ExperimentContext,
  nextRunConcept,
} from '@/src/domain/experiment';
import { experimentConditionState } from '@/src/domain/experiment/delta';
import { measurementRows } from '@/src/domain/measurement/presentation';
import { Badge } from '@/src/shared/ui/workspace';
export function NextRun({ context }: { context: ExperimentContext }) {
  const next = nextRunConcept(context);
  const preview = experimentConditionState(context);
  return (
    <Dialog>
      <DialogTrigger className="primary-button">
        Create Next Run <ArrowRight size={15} />
      </DialogTrigger>
      <DialogContent className="!max-w-lg !p-7">
        <span className="dialog-icon">
          <Copy size={21} />
        </span>
        <DialogTitle className="!text-xl">
          Start from Run #{context.run.runNumber}
        </DialogTitle>
        <DialogDescription>
          New run will inherit previous conditions.
        </DialogDescription>
        <div className="inherit-preview">
          <div>
            <span className="muted">Next iteration</span>
            <strong>Run #{next.runNumber}</strong>
          </div>
          {preview.slice(0, 2).map((item) => (
            <div key={item.key}>
              <span className="muted">{item.label}</span>
              <strong>
                {item.value} {item.unit}
                {item.detail && <small> · {item.detail}</small>}
              </strong>
            </div>
          ))}
          <div>
            <span className="muted">Conditions carried forward</span>
            <strong>
              {next.conditions.length + next.materialConditions.length}
            </strong>
          </div>
        </div>
        <div className="next-note">
          <span className="small-label">SUGGESTED NEXT ACTION</span>
          <p>{context.decision?.nextAction?.note}</p>
        </div>
        <p className="muted">
          This preview carries the complete intended snapshot into the Run
          planner. Nothing is saved yet.
        </p>
        <Link
          className="primary-button"
          href={`/runs/new?area=CMP&from=${context.run.runNumber}`}
        >
          Open Run Planner <ArrowRight size={15} />
        </Link>
        <DialogClose className="secondary-button">
          Back to experiment
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
export function MeasurementDetails({
  context,
  previous,
}: {
  context: ExperimentContext;
  previous?: ExperimentContext;
}) {
  const metrics = measurementRows(context, previous);
  return (
    <details className="measurement-details">
      <summary>View details</summary>
      <div className="detail-content">
        <p className="muted">
          Curated snapshot ·{' '}
          {context.waferIdentityObservations[0]?.observedWaferId} · Mock
          metrology
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Parameter</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Layer</TableHead>
              <TableHead>Previous run Δ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {metrics.map((m) => (
              <TableRow key={m.id}>
                <TableCell>{m.parameter}</TableCell>
                <TableCell>
                  {m.value} {m.unit}
                </TableCell>
                <TableCell>
                  <Badge>{m.layer}</Badge>
                </TableCell>
                <TableCell>
                  {m.trendVsPreviousRun === null
                    ? 'Baseline'
                    : `${m.trendVsPreviousRun > 0 ? '+' : ''}${m.trendVsPreviousRun.toFixed(2)}%`}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="detail-footnote">
          RAW and DERIVED layers are modeled; this slice contains curated
          summaries only.
        </p>
      </div>
    </details>
  );
}
export function EvidenceGallery({ context }: { context: ExperimentContext }) {
  const metrics = measurementRows(context);
  const [selected, setSelected] = useState<string | null>(null);
  const evidence = context.evidence.find((e) => e.id === selected);
  return (
    <>
      <div className="evidence-grid">
        {context.evidence.map((e) => (
          <button
            key={e.id}
            className="evidence-tile"
            onClick={() => setSelected(e.id)}
          >
            <div
              className={`evidence-preview ${e.type === 'Report' ? 'report-preview' : ''}`}
            >
              {e.type === 'Report' ? (
                <>
                  <FileText size={29} />
                  <span>METROLOGY REPORT</span>
                  <span>Run #{context.run.runNumber} · Curated summary</span>
                </>
              ) : (
                <img
                  src={e.snapshotPath}
                  alt={
                    e.type === 'Wafer Map'
                      ? 'Illustrative mock wafer map'
                      : 'DTS progression across runs'
                  }
                />
              )}
              <Maximize2 className="expand-evidence" size={14} />
            </div>
            <div className="evidence-caption">
              <strong>{e.title}</strong>
              <span>{e.type} · Snapshot</span>
            </div>
          </button>
        ))}
      </div>
      <Dialog
        open={!!evidence}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="!max-w-2xl !p-7">
          <DialogTitle>{evidence?.title}</DialogTitle>
          <DialogDescription>{evidence?.description}</DialogDescription>
          {evidence?.type === 'Report' ? (
            <div className="report-body">
              <p className="small-label">
                MOCK METROLOGY · RUN #{context.run.runNumber}
              </p>
              <h3>Measurement summary</h3>
              {metrics.map((m) => (
                <p key={m.id}>
                  {m.parameter}:{' '}
                  <strong>
                    {m.value} {m.unit}
                  </strong>
                </p>
              ))}
              <p>
                Wafer: {context.waferIdentityObservations[0]?.observedWaferId}
              </p>
              <p>Recipe: {context.execution[0].observedRecipe}</p>
            </div>
          ) : (
            evidence && (
              <img
                className="evidence-large"
                src={evidence.snapshotPath}
                alt={evidence.title}
              />
            )
          )}
          <p className="muted">
            {evidence?.sourceSystem} · Run #{context.run.runNumber}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
