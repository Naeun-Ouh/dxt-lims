'use client';
import { useLocale } from '@/src/shared/i18n/locale';

import type {SeriesWorkspaceProjection} from '@/src/mock/series-workspaces';
import {SeriesRunList} from './productized-series';
import {useRepositorySeriesRuns} from './use-repository-series-runs';
export default function RepositorySeriesRuns({series,canCreateRun=true}:{series:SeriesWorkspaceProjection;canCreateRun?:boolean}){
  const { t } = useLocale();
 const {rows,error,connected,hasMore,loadMore}=useRepositorySeriesRuns(series.slug);
 if(!connected)return <SeriesRunList canCreateRun={canCreateRun} series={series}/>;
 if(error)return <p role="alert">{t(error)}</p>;
 if(!rows)return <p>{t("Loading Runs…")}</p>;
 return <><SeriesRunList canCreateRun={canCreateRun} series={{...series,runs:rows}}/>{hasMore&&<button className="secondary-button" onClick={loadMore}>{t("Load more Runs")}</button>}</>;
}
