'use client';
import { useLocale } from '@/src/shared/i18n/locale';

import { useState } from 'react';
import {
  Boxes,
  ChevronRight,
  Layers3,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { Workspace } from '@/src/shared/ui/workspace';
import type { StudioSection } from './authoring-model';
import { useDxtApplication } from '@/src/application/dxt-application-provider';
import { DefinitionsView } from './definitions-view';
import { ApplicabilityView } from './applicability-view';
import { PackageView } from './package-view';

const sections = [
  {
    id: 'definitions' as const,
    label: 'Definitions',
    description: 'What exists',
    icon: Boxes,
  },
  {
    id: 'applicability' as const,
    label: 'Applicability',
    description: 'Where it can be used',
    icon: SlidersHorizontal,
  },
  {
    id: 'packages' as const,
    label: 'Package Versions',
    description: 'What is active',
    icon: Layers3,
  },
];

export default function ReferenceStudioHome({
  initialSection = 'definitions',
  initialDefinition = 'condition-energy-v1',
  initialPackage = 'config-package-photo-v2',
  initialPreview = false,
  initialValidation = false,
  initialDefinitionInspector = false,
  initialReview = false,
}: {
  initialSection?: StudioSection;
  initialDefinition?: string;
  initialPackage?: string;
  initialPreview?: boolean;
  initialValidation?: boolean;
  initialDefinitionInspector?: boolean;
  initialReview?: boolean;
}) {
  const { t } = useLocale();

  const { application } = useDxtApplication();
  const studioRepository = application.repositories.configuration;
  const [section, setSection] = useState<StudioSection>(initialSection);
  const [definitionId, setDefinitionId] = useState(initialDefinition);
  const [packageId, setPackageId] = useState(initialPackage);
  const [revision, setRevision] = useState(studioRepository.getRevision());
  const refresh = () =>
    setRevision(application.repositories.configuration.getRevision());
  const packageScope = studioRepository
    .getConfigurationRegistry()
    .packages.find((item) => item.id === packageId)?.scope;
  const contextLabel =
    packageScope && 'ownerId' in packageScope
      ? packageScope.ownerId.replaceAll('-', ' ').toUpperCase()
      : 'DXT CONFIGURATION';
  return (
    <Workspace page="Reference" contextLabel={contextLabel} catalogShell>
      <div className="reference-studio" data-repository-revision={revision}>
        <header className="rs-header">
          <div>
            <span className="eyebrow">{t('CONFIGURATION GOVERNANCE')}</span>
            <h1>{t('Reference Studio')}</h1>
            <p>
              {t(
                'Configure how experiments work in DXT: define a concept, decide where it applies, test it, then release a package.',
              )}
            </p>
          </div>
          <div className="rs-flow">
            <strong>{t('Definition')}</strong>
            <ChevronRight size={14} />
            <strong>{t('Applicability')}</strong>
            <ChevronRight size={14} />
            <strong>{t('Test Configuration')}</strong>
            <ChevronRight size={14} />
            <strong>{t('Package Version')}</strong>
          </div>
        </header>
        <div className="rs-shell">
          <aside className="rs-nav">
            <span className="rs-kicker">{t('AUTHORING')}</span>
            {sections.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={section === item.id ? 'active' : ''}
                  aria-current={section === item.id ? 'page' : undefined}
                  onClick={() => {
                    setSection(item.id);
                    const url = new URL(window.location.href);
                    url.search = '';
                    url.searchParams.set('section', item.id);
                    window.history.replaceState(null, '', url);
                  }}
                >
                  <Icon size={16} />
                  <span>
                    <strong>{t(item.label)}</strong>
                    <small>{t(item.description)}</small>
                  </span>
                </button>
              );
            })}
            <div className="rs-nav-note">
              <ShieldCheck size={16} />
              <strong>{t('Immutable revisions')}</strong>
              <p>{t('Released artifacts are never edited in place.')}</p>
            </div>
          </aside>
          <section className="rs-workarea">
            {section === 'definitions' ? (
              <DefinitionsView
                selectedId={definitionId}
                onSelect={setDefinitionId}
                onGoApplicability={() => setSection('applicability')}
                refresh={refresh}
                initialInspectorOpen={initialDefinitionInspector}
              />
            ) : section === 'applicability' ? (
              <ApplicabilityView
                selectedId={definitionId}
                onSelect={setDefinitionId}
                onGoPackages={() => setSection('packages')}
                refresh={refresh}
                initialPreview={initialPreview}
                initialPreviewPackageId={initialPackage}
                initialInspectorOpen={initialDefinitionInspector}
              />
            ) : (
              <PackageView
                selectedId={packageId}
                onSelect={setPackageId}
                refresh={refresh}
                initialReview={initialReview}
                initialValidation={initialValidation}
                initialInspectorOpen={initialDefinitionInspector}
              />
            )}
          </section>
        </div>
      </div>
    </Workspace>
  );
}
