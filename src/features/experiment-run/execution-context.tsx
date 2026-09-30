'use client';

import { useState } from 'react';
import {
  ArrowDown,
  Check,
  CircleAlert,
  GitCompareArrows,
  Microscope,
  Route,
  X,
} from 'lucide-react';
import type { ExperimentContext } from '@/src/domain/experiment';
import { Badge } from '@/src/shared/ui/workspace';

export function ExecutionContextView({
  context,
}: {
  context: ExperimentContext;
}) {
  const [identityWaferId, setIdentityWaferId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<string[]>([]);
  const processItems = context.plannedExecutionItems.filter(
    (item) => item.operationRole === 'PROCESS',
  );
  const openCandidateCount = context.waferIdentityCandidates.filter(
    (item) => !confirmed.includes(item.observationId),
  ).length;
  return (
    <div className="execution-workbench">
      <div className="execution-summary">
        <SummaryStat
          label="Planned wafers"
          value={new Set(processItems.map((item) => item.waferSubjectId)).size}
        />
        <SummaryStat label="Observed wafers" value={context.execution.length} />
        <SummaryStat
          label="Observed"
          value={
            context.execution.filter(
              (item) => item.executionStatus === 'COMPLETED',
            ).length
          }
        />
        <SummaryStat
          label="Needs review"
          value={openCandidateCount}
          attention={openCandidateCount > 0}
        />
      </div>
      <div className="execution-table-heading">
        <div>
          <span>PLAN VS ACTUAL</span>
          <h3>Wafer execution set</h3>
        </div>
        <p>Neutral manufacturing observation · no verification applied</p>
      </div>
      <div className="execution-comparison-wrap">
        <table className="execution-comparison">
          <thead>
            <tr>
              <th>Planned wafer</th>
              <th>Planned operation</th>
              <th>Actual operation</th>
              <th>Planned / actual recipe</th>
              <th>Planned / actual equipment</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {processItems.map((item, index) => {
              const actual = context.execution.find(
                (event) => event.plannedExecutionItemId === item.id,
              );
              const candidate = context.waferIdentityCandidates[index];
              const needsReview =
                candidate && !confirmed.includes(candidate.observationId);
              return (
                <tr key={item.id}>
                  <td>
                    <b>{item.waferSubjectId}</b>
                    <small>Slot {String(index + 11).padStart(2, '0')}</small>
                  </td>
                  <td>
                    {
                      context.definitions.operations.find(
                        (o) => o.id === item.operationDefinitionId,
                      )?.name
                    }
                  </td>
                  <td>{actual?.observedOperation ?? '—'}</td>
                  <td>
                    <span>{item.plannedRecipe}</span>
                    <small>{actual?.observedRecipe ?? 'Not observed'}</small>
                  </td>
                  <td>
                    <span>{item.plannedEquipment}</span>
                    <small>{actual?.equipment ?? 'Not observed'}</small>
                  </td>
                  <td>
                    {needsReview ? (
                      <button
                        className="identity-review-link"
                        onClick={() =>
                          setIdentityWaferId(candidate.candidatePhysicalWaferId)
                        }
                      >
                        <CircleAlert size={12} /> Needs identity review
                      </button>
                    ) : (
                      <Badge tone="blue">Observed</Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="execution-plan-flow">
        <span>PLANNED FLOW</span>
        <div>
          {context.plannedExecutionItems
            .filter(
              (item) => item.waferSubjectId === processItems[0]?.waferSubjectId,
            )
            .map((item, index) => (
              <div key={item.id}>
                {index > 0 && <ArrowDown size={13} />}
                <p>
                  <Badge
                    tone={item.operationRole === 'PROCESS' ? 'neutral' : 'blue'}
                  >
                    {item.operationRole}
                  </Badge>
                  <b>
                    {item.operationRole === 'PROCESS'
                      ? context.definitions.operations.find(
                          (o) => o.id === item.operationDefinitionId,
                        )?.name
                      : context.definitions.measurementOperations.find(
                          (o) => o.id === item.measurementOperationDefinitionId,
                        )?.name}
                  </b>
                  {item.measurementPoint && (
                    <small>{item.measurementPoint}</small>
                  )}
                </p>
              </div>
            ))}
        </div>
        <small>
          Process and measurement roles are configured explicitly. Measurement
          timing remains separate.
        </small>
      </div>
      <div className="execution-boundary-note">
        <b>Planned</b> wafer × process-step assignments <span>→</span>{' '}
        <b>Actual</b> manufacturing observations
        <small>
          Lot and Slot remain observed context, not permanent wafer identity.
        </small>
      </div>
      {identityWaferId && (
        <IdentityDetail
          context={context}
          waferId={identityWaferId}
          confirmed={confirmed}
          onConfirm={(id) => setConfirmed((current) => [...current, id])}
          onClose={() => setIdentityWaferId(null)}
        />
      )}
    </div>
  );
}

function IdentityDetail({
  context,
  waferId,
  confirmed,
  onConfirm,
  onClose,
}: {
  context: ExperimentContext;
  waferId: string;
  confirmed: string[];
  onConfirm: (id: string) => void;
  onClose: () => void;
}) {
  const wafer = context.physicalWafers.find((item) => item.id === waferId)!;
  const candidate = context.waferIdentityCandidates.find(
    (item) => item.candidatePhysicalWaferId === waferId,
  );
  const isConfirmed = candidate
    ? confirmed.includes(candidate.observationId)
    : true;
  const observations = context.waferIdentityObservations
    .filter(
      (item) =>
        item.physicalWaferId === waferId ||
        candidate?.observationId === item.id,
    )
    .sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));
  return (
    <div className="identity-detail">
      <header>
        <div>
          <span>IDENTITY CONTINUITY DETAIL</span>
          <h3>{wafer.canonicalLabel}</h3>
          <p>Internal DXT LIMS continuity identity</p>
        </div>
        <button aria-label="Close identity detail" onClick={onClose}>
          <X size={16} />
        </button>
      </header>
      <div className="identity-detail-body">
        <div className="wafer-timeline">
          {observations.map((observation, index) => {
            const event = context.execution.find(
              (item) => item.waferIdentityObservationId === observation.id,
            );
            const changed =
              index > 0 &&
              (observations[index - 1].observedLotId !==
                observation.observedLotId ||
                observations[index - 1].slotPosition !==
                  observation.slotPosition);
            return (
              <div className="wafer-timeline-item" key={observation.id}>
                {changed && (
                  <div className="identity-change-note">
                    <GitCompareArrows size={13} /> Manufacturing identity
                    changed
                  </div>
                )}
                <span className="timeline-dot">
                  {event ? <Route size={13} /> : <Microscope size={13} />}
                </span>
                <div>
                  <span>
                    {event
                      ? 'PROCESS EXECUTION'
                      : observation.observedOperationCode.replace('_', ' ')}
                  </span>
                  <b>
                    {event
                      ? event.observedOperation
                      : observation.observedOperationCode === 'PRE_METROLOGY'
                        ? 'PRE Measurement'
                        : 'POST Measurement'}
                  </b>
                  <p>
                    {observation.observedLotId} / Slot{' '}
                    {observation.slotPosition}
                  </p>
                  {event && (
                    <small>
                      Recipe {event.observedRecipe} · Equipment{' '}
                      {event.equipment}
                    </small>
                  )}
                  <small>
                    {observation.observedAt.slice(11, 16)} ·{' '}
                    {observation.sourceSystem}
                  </small>
                </div>
                <Badge
                  tone={
                    observation.identityStatus === 'CANDIDATE' && !isConfirmed
                      ? 'amber'
                      : 'green'
                  }
                >
                  {isConfirmed && observation.id === candidate?.observationId
                    ? 'CONFIRMED'
                    : observation.identityStatus}
                </Badge>
                {index < observations.length - 1 && (
                  <ArrowDown className="timeline-arrow-down" size={14} />
                )}
              </div>
            );
          })}
        </div>
        {candidate && !isConfirmed && (
          <div className="identity-review">
            <div className="identity-review-title">
              <CircleAlert size={15} />
              <div>
                <b>Identity needs review</b>
                <span>Possible match: {wafer.canonicalLabel}</span>
              </div>
              <Badge tone="amber">
                {Math.round(candidate.confidence * 100)}% candidate
              </Badge>
            </div>
            <small>{candidate.reason} Confidence is informational.</small>
            <button
              className="secondary-button"
              onClick={() => onConfirm(candidate.observationId)}
            >
              <Check size={13} /> Confirm same physical wafer
            </button>
          </div>
        )}
        {isConfirmed && candidate && (
          <div className="identity-confirmed-note">
            <Check size={14} /> Engineer confirmed continuity for this mock
            session.
          </div>
        )}
      </div>
    </div>
  );
}
function SummaryStat({
  label,
  value,
  attention = false,
}: {
  label: string;
  value: number;
  attention?: boolean;
}) {
  return (
    <div className={attention ? 'attention' : ''}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}
