'use client';
import { useLocale } from '@/src/shared/i18n/locale';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, ArrowDown, Pencil, UserRound } from 'lucide-react';
import {
  contexts,
  series,
  selectedContext,
  previousContext,
} from '@/src/mock/experiments';
import { createExperimentDelta } from '@/src/domain/experiment/delta';
import { measurementRows } from '@/src/domain/measurement/presentation';
import { evaluationRows } from '@/src/domain/decision/presentation';
import {
  Badge,
  runPath,
  SectionLabel,
  Workspace,
} from '@/src/shared/ui/workspace';
export default function ExperimentSeries() {
  const { t } = useLocale();
  const [editingDefaults, setEditingDefaults] = useState(false);
  const [pressure, setPressure] = useState('3.0');
  return (
    <Workspace page="Series">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t("STUDY · EXP-001")}</p>
          <h1>{series.title}</h1>
          <p className="muted">
            {selectedContext.intent.purpose ?? t("Intent not recorded")}
          </p>
        </div>
        <Badge tone="green">{t("Active")}</Badge>
      </div>
      <div className="series-meta">
        <span>
          <UserRound size={14} />
          {series.owner}
        </span>
        <span>{contexts[0].experimentType.name}</span>
        <span>
          {selectedContext.projectContext.length
            ? selectedContext.projectContext
                .map((x) => x.project.title)
                .join(' · ')
            : t("Independent experiment")}
        </span>
        <span>{t("Created 24 Aug 2026")}</span>
        <span>{t("104 runs")}</span>
      </div>
      <section className="series-target-strip" aria-label={t("Study targets")}>
        <div>
          <span className="eyebrow">{t("STUDY TARGETS / KPI")}</span>
          <small>{t("Targets are configured expectations, separate from measurements and engineer evaluation.")}</small>
        </div>
        {series.targets.map((target) => (
          <div key={target.id}>
            <b>
              {target.parameterDefinitionId
                .replace('parameter-', '')
                .replace('-v1', '')
                .toUpperCase()}
            </b>
            <span>
              {target.operator === 'BETWEEN'
                ? `${target.lowerBound} – ${target.upperBound}`
                : `${target.operator === 'GTE' ? '≥' : '≤'} ${target.threshold}`}
            </span>
          </div>
        ))}
      </section>
      <section className="series-default-panel" id="default-setup">
        <header>
          <div>
            <span className="eyebrow">{t("DEFAULT EXPERIMENT SETUP")}</span>
            <h2>{t("How this Study normally runs")}</h2>
            <p>{t("Optional starting configuration. Every Run can change it.")}</p>
          </div>
          <button
            className="secondary-button"
            onClick={() => setEditingDefaults((value) => !value)}
          >
            <Pencil size={13} /> {editingDefaults ? t("Done") : t("Edit defaults")}
          </button>
        </header>
        <div className="series-default-grid">
          {(
            [
              'OPERATION',
              'CONDITION',
              'MATERIAL',
              'MEASUREMENT',
              'EVALUATION_CRITERION',
            ] as const
          ).map((kind) => {
            const items =
              series.defaultConfiguration?.items.filter(
                (item) => item.kind === kind,
              ) ?? [];
            return (
              <div key={kind}>
                <span>
                  {kind === 'OPERATION'
                    ? t("Process flow")
                    : kind === 'MATERIAL'
                      ? t("Material / Sample")
                      : kind === 'EVALUATION_CRITERION'
                        ? t("Evaluation criteria")
                        : kind === 'MEASUREMENT'
                          ? t("Measurement plan")
                          : t("Conditions")}
                </span>
                {items.length ? (
                  items.map((item) => (
                    <b key={item.id}>
                      {item.id === 'default-pressure' && editingDefaults ? (
                        <>
                          {item.label} ·{' '}
                          <input
                            aria-label={t("Default pressure")}
                            value={pressure}
                            onChange={(e) => setPressure(e.target.value)}
                          />{' '}
                          psi
                        </>
                      ) : (
                        <>
                          {item.label}
                          {item.id === 'default-pressure'
                            ? t("· {0} psi", [pressure])
                            : item.value
                              ? ` · ${item.value.value}${item.unit ? ` ${item.unit}` : ''}`
                              : ''}
                        </>
                      )}
                    </b>
                  ))
                ) : (
                  <em>{t("Not defined")}</em>
                )}
              </div>
            );
          })}
        </div>
        <small>{t("Defaults guide setup; they do not lock scientific configuration.")}</small>
      </section>
      <SectionLabel>{t("Experiment evolution")}</SectionLabel>
      <div className="evolution-header">
        <span>{t("ITERATION")}</span>
        <span>{t("WHAT CHANGED")}</span>
        <span>{t("CURATED RESULTS")}</span>
        <span>{t("DECISION")}</span>
      </div>
      <div className="timeline">
        {contexts.map((c, i) => {
          const previous = previousContext(c),
            delta = createExperimentDelta(c, previous);
          const metrics = measurementRows(c, previous),
            evaluations = evaluationRows(c);
          const selected = c.run.id === selectedContext.run.id;
          return (
            <div key={c.run.id} className="timeline-item">
              <span className={`timeline-node ${selected ? 'selected' : ''}`}>
                {c.run.runNumber.toString().padStart(2, '0')}
              </span>
              <Link
                href={runPath(c.run.runNumber)}
                className={`evolution-row ${selected ? 'selected' : ''}`}
              >
                <div>
                  <h3>{t("Run #")}{c.run.runNumber}</h3>
                  <p className="muted">{c.run.startedAt?.slice(0, 10)}</p>
                  {selected && <Badge tone="blue">{t("Selected")}</Badge>}
                </div>
                <div className="evolution-change">
                  {(delta.isBaseline
                    ? delta.changed.slice(0, 2)
                    : delta.changed
                  ).map((c) => (
                    <div key={c.key}>
                      <span>{c.label}</span>
                      <strong className="mono">
                        {c.previous !== null && (
                          <>
                            <span className="previous">{c.previous}</span>
                            <span className="change-arrow">→</span>
                          </>
                        )}
                        {c.current ?? t("Removed")} {c.unit}
                      </strong>
                    </div>
                  ))}
                  <small>
                    {i
                      ? t("{0} conditions unchanged", [delta.unchangedCount])
                      : t("Initial condition set")}
                  </small>
                </div>
                <div className="evolution-metrics">
                  {metrics
                    .filter((m) => m.layer === 'CURATED')
                    .map((m) => (
                      <div key={m.id}>
                        <span>{m.parameter}</span>
                        <strong className="mono">{m.value}</strong>
                      </div>
                    ))}
                </div>
                <div className="evolution-decision">
                  <small>{t("ENGINEER EVALUATION")}</small>
                  {evaluations.map((e) => (
                    <Badge key={e.id} tone={e.tone}>
                      {e.value} {e.unit}
                    </Badge>
                  ))}
                  <ArrowRight size={17} />
                </div>
              </Link>
              {i < 3 && <ArrowDown className="timeline-arrow" size={13} />}
            </div>
          );
        })}
      </div>
      <div className="series-bottom">
        <span className="muted">{t("One objective. Four iterations. Every change in context.")}</span>
        <div className="series-actions">
          <Link href="/analysis?study=dts-improvement" className="secondary-button">{t("Analyze Runs")}</Link>
          <Link href="/runs/new?area=CMP" className="secondary-button">{t("Plan new Run")}</Link>
          <Link
            href={runPath(selectedContext.run.runNumber)}
            className="primary-button"
          >{t("Open selected run")}{" "}<ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </Workspace>
  );
}
