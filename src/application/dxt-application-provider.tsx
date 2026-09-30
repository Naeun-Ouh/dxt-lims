'use client';
import { useLocale } from '@/src/shared/i18n/locale';
import { AuthoringRuntimeConfiguration, productionConfigurationCommands, type ConfigurationCommandFacade } from './configuration-command-facade';
import { httpConfigurationAuthoring } from '@/src/infrastructure/http/http-repositories';
import {seriesWorkspaceScenarios} from '@/src/mock/series-workspaces';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { ConfigurationManagementCommands, InMemoryConfigurationRepository } from '@/src/domain/reference';
import { configurationRegistry, registeredConfigurationEditorKeys } from '@/src/mock/configuration-packages';
import { definitions } from '@/src/mock/reference';
import { createBrowserRepositories } from '@/src/infrastructure/browser/browser-repositories';
import { createHttpRepositories } from '@/src/infrastructure/http/http-repositories';
import { analysisMeasurementSources, savedAnalysisViews } from '@/src/mock/analysis-workspace';
import { DxtApplication } from './dxt-application';

export type DxtApplicationContextValue = {
  application: DxtApplication;
  configurationCommands: ConfigurationCommandFacade;
};

const Context = createContext<DxtApplicationContextValue | null>(null);

export function createBrowserApplication(): DxtApplicationContextValue {
  const configuration = new InMemoryConfigurationRepository(configurationRegistry);
  return {
    application: new DxtApplication(createBrowserRepositories(configuration),analysisMeasurementSources,savedAnalysisViews,Object.fromEntries(Object.entries(seriesWorkspaceScenarios).map(([slug,s])=>[slug,s.runs]))),
    configurationCommands: new ConfigurationManagementCommands(configuration, definitions, registeredConfigurationEditorKeys),
  };
}

export function DxtApplicationProvider({ children, value, adapter = 'browser' }: { children: ReactNode; value?: DxtApplicationContextValue; adapter?: 'browser' | 'postgres' }) {
  const { t } = useLocale();
  const [owned, setOwned] = useState(() => value ?? (adapter === 'browser' ? createBrowserApplication() : null));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (owned || adapter !== 'postgres') return;
    let active = true;
    void fetch('/api/repository', { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) throw new Error('Production configuration could not be loaded.');
      const configuration = new AuthoringRuntimeConfiguration(await response.json());
      const application=new DxtApplication(createHttpRepositories(configuration),[],[],{},httpConfigurationAuthoring);
      if(active)setOwned({application,configurationCommands:productionConfigurationCommands(application)});
    }).catch(() => { if (active) setError('Production repository unavailable. No fallback was loaded.'); });
    return () => { active = false; };
  }, [adapter, owned]);
  if (error) return <main role="alert">{t(error)}</main>;
  if (!owned) return <main>{t('Loading repository…')}</main>;
  return <Context.Provider value={owned}>{children}</Context.Provider>;
}

export function useDxtApplication() {
  const value = useContext(Context);
  if (!value) throw new Error('DXT application composition is missing.');
  return value;
}

export function useOptionalDxtApplication(){return useContext(Context);}
