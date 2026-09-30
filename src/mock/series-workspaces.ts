export type SeriesWorkspaceProjection = {
  slug: string;
  id: string;
  name: string;
  experimentType: string;
  area: string;
  owner: string;
  organization: string;
  workspaceContextLabel?: string;
  createdAt: string;
  updatedAt: string;
  status: 'Active' | 'Paused' | 'Completed';
  runCount: number;
  intent: { purpose: string; hypothesis: string };
  targets: Array<{
    id: string;
    parameter: string;
    rule: string;
    unit: string;
    achieved: number;
    total: number;
    note?: string;
  }>;
  defaults: Array<{
    group:
      | 'Process / Operation Plan'
      | 'Recipe'
      | 'Conditions'
      | 'Material / Sample'
      | 'Resources / Consumables'
      | 'Measurement Plan';
    items: Array<{
      label: string;
      value: string;
      context: string;
      role?: 'FIXED' | 'VARIED';
    }>;
  }>;
  runs: Array<{
    number: number;
    name: string;
    date: string;
    updated: string;
    wafers: number;
    delta: string[];
    unchanged: number;
    evaluation: string;
    nextAction: string;
    lifecycle: 'PLAN' | 'ACTUAL' | 'MEASUREMENT' | 'EVALUATION';
    runStatus: 'IN_PROGRESS' | 'COMPLETED';
    workspaceHref: string | null;
  }>;
  summaries: Array<{
    number: number;
    date: string;
    author: string;
    title: string;
    summary: string;
    runs: string[];
    wafers: string[];
  }>;
};

export const seriesWorkspaceScenarios: Record<
  'dts-improvement' | 'cmp-stability' | 'adhesion-material-optimization',
  SeriesWorkspaceProjection
> = {
  'adhesion-material-optimization': {
    slug: 'adhesion-material-optimization', id: 'EXP-MAT-001',
    name: 'Adhesion Material Optimization', experimentType: 'Material Experiment',
    area: 'Material R&D', owner: 'Kim Jiwon', organization: 'Materials R&D · Formulation',
    workspaceContextLabel: 'MATERIAL R&D',
    createdAt: '2026-09-10', updatedAt: '2026-09-13', status: 'Active', runCount: 3,
    intent: {
      purpose: 'Optimize formulation and process conditions to improve adhesion performance.',
      hypothesis: 'Higher cure temperature can improve peel force while formulation and cure time remain controlled.',
    },
    targets: [{ id: 'target-material-peel-force', parameter: 'Peel Force', rule: '≥ 22', unit: 'N', achieved: 2, total: 4 }],
    defaults: [
      { group: 'Process / Operation Plan', items: [
        { label: '01', value: 'Mix', context: 'Material R&D' },
        { label: '02', value: 'Coat', context: 'Material R&D' },
        { label: '03', value: 'Cure', context: 'Material R&D' },
        { label: '04', value: 'Test', context: 'Material R&D' },
      ] },
      { group: 'Material / Sample', items: [{ label: 'Formulation', value: 'F-BASE-01', context: 'Structured revision · 60/30/10 wt%', role: 'FIXED' }] },
      { group: 'Conditions', items: [
        { label: 'Mixing Speed', value: '500 rpm', context: 'Mix · Subject', role: 'FIXED' },
        { label: 'Cure Temperature', value: '120 °C', context: 'Cure · Subject', role: 'VARIED' },
      ] },
      { group: 'Measurement Plan', items: [{ label: 'Test', value: 'Peel Force · Viscosity', context: 'FINAL · Manual acquisition' }] },
    ],
    runs: [{
      number: 3, name: 'Cure temperature response', date: '2026-09-13', updated: 'Today 16:00',
      wafers: 4, delta: ['Cure Temperature 110–140 °C'], unchanged: 4,
      evaluation: 'Higher temperature improved adhesion', nextAction: 'Create Next Run',
      lifecycle: 'EVALUATION', runStatus: 'IN_PROGRESS',
      workspaceHref: '/series/adhesion-material-optimization/runs/3/engineering-grid?view=plan',
    }],
    summaries: [
      { number: 2, date: '2026-09-13', author: 'Kim Jiwon', title: 'Cure response', summary: 'Peel force increased across the configured cure-temperature split.', runs: ['Run 3'], wafers: ['SP-01', 'SP-02', 'SP-03', 'SP-04'] },
      { number: 1, date: '2026-09-12', author: 'Kim Jiwon', title: 'Formulation baseline', summary: 'F-BASE-01 is retained as the controlled structured formulation.', runs: ['Run 2', 'Run 3'], wafers: ['SP-01', 'SP-02'] },
    ],
  },
  'dts-improvement': {
    slug: 'dts-improvement',
    id: 'EXP-001',
    name: 'DTS Improvement',
    experimentType: 'Process Experiment',
    area: 'PHOTO',
    owner: 'Lee Seunghyun',
    organization: 'Semiconductor R&D · Lithography',
    createdAt: '2026-08-24',
    updatedAt: '2026-09-11',
    status: 'Active',
    runCount: 18,
    intent: {
      purpose:
        'Improve DTS while keeping BCD and within-wafer variation stable.',
      hypothesis:
        'Exposure energy and SampleRevision changes can raise DTS without degrading BCD.',
    },
    targets: [
      {
        id: 'target-dts',
        parameter: 'DTS',
        rule: '≥ 4.4',
        unit: '',
        achieved: 1,
        total: 4,
      },
      {
        id: 'target-bcd',
        parameter: 'BCD',
        rule: '16.8 – 17.2',
        unit: 'nm',
        achieved: 2,
        total: 4,
      },
      {
        id: 'target-3sig',
        parameter: '3SIG',
        rule: '≤ 1.3',
        unit: 'nm',
        achieved: 1,
        total: 4,
      },
    ],
    defaults: [
      {
        group: 'Process / Operation Plan',
        items: [
          { label: '01', value: 'Coating', context: 'PHOTO' },
          { label: '02', value: 'Exposure', context: 'PHOTO' },
        ],
      },
      {
        group: 'Recipe',
        items: [
          {
            label: 'Exposure recipe',
            value: 'EXP_RCP_01',
            context: 'Exposure',
            role: 'FIXED',
          },
        ],
      },
      {
        group: 'Conditions',
        items: [
          {
            label: 'Energy',
            value: '35 mJ',
            context: 'Exposure · Operation',
            role: 'VARIED',
          },
          {
            label: 'Focus',
            value: '0.0',
            context: 'Exposure · Operation',
            role: 'FIXED',
          },
        ],
      },
      {
        group: 'Material / Sample',
        items: [
          {
            label: 'Sample',
            value: 'D035 Rev.2',
            context: 'Wafer default · exact revision',
            role: 'FIXED',
          },
        ],
      },
      {
        group: 'Resources / Consumables',
        items: [
          {
            label: 'Reticle',
            value: 'RET_A',
            context: 'Exposure · Operation',
            role: 'FIXED',
          },
        ],
      },
      {
        group: 'Measurement Plan',
        items: [
          {
            label: 'CD-SEM',
            value: 'BCD · 3SIG · LER · LWR',
            context: 'POST · acquisition source selected later',
          },
        ],
      },
    ],
    runs: [
      {
        number: 18,
        name: 'Energy window confirmation',
        date: '2026-09-11',
        updated: 'Yesterday 17:42',
        wafers: 25,
        delta: ['Energy 34–37 mJ/cm²'],
        unchanged: 11,
        evaluation: 'Needs review',
        nextAction: 'Design Next Experiment',
        lifecycle: 'EVALUATION',
        runStatus: 'IN_PROGRESS',
        workspaceHref:
          '/series/dts-improvement/runs/18/engineering-grid?view=evaluation',
      },
      {
        number: 4,
        name: 'Energy 35 / D035 Rev.2',
        date: '2026-09-02',
        updated: 'Sep 02',
        wafers: 5,
        delta: [
          'Energy 32 → 35 mJ',
          'Sample D035 Rev.1 → Rev.2',
          'Repeated POST measurement',
        ],
        unchanged: 13,
        evaluation: 'Better',
        nextAction: 'Design Next Experiment · Test Energy 36–38',
        lifecycle: 'EVALUATION',
        runStatus: 'COMPLETED',
        workspaceHref: '/series/dts-improvement/runs/4',
      },
      {
        number: 3,
        name: 'Energy 32 / D035 Rev.1',
        date: '2026-08-31',
        updated: 'Aug 31',
        wafers: 3,
        delta: ['Sample D031 Rev.3 → D035 Rev.1'],
        unchanged: 14,
        evaluation: 'Better',
        nextAction: 'Retry with Changed Conditions',
        lifecycle: 'EVALUATION',
        runStatus: 'COMPLETED',
        workspaceHref: '/series/dts-improvement/runs/3',
      },
      {
        number: 2,
        name: 'Energy 32 / D031 Rev.3',
        date: '2026-08-27',
        updated: 'Aug 27',
        wafers: 2,
        delta: ['Energy 30 → 32 mJ'],
        unchanged: 14,
        evaluation: 'Similar',
        nextAction: 'Additional Measurement',
        lifecycle: 'EVALUATION',
        runStatus: 'COMPLETED',
        workspaceHref: '/series/dts-improvement/runs/2',
      },
      {
        number: 1,
        name: 'Baseline · Energy 30',
        date: '2026-08-24',
        updated: 'Aug 24',
        wafers: 2,
        delta: ['Initial full snapshot'],
        unchanged: 0,
        evaluation: 'Worse',
        nextAction: 'Retry with Changed Conditions',
        lifecycle: 'EVALUATION',
        runStatus: 'COMPLETED',
        workspaceHref: '/series/dts-improvement/runs/1',
      },
    ],
    summaries: [
      {
        number: 2,
        date: '2026-09-02',
        author: 'Lee Seunghyun',
        title: 'D035 Rev.2 reached the current target window',
        summary:
          'Energy 35 improved DTS while BCD and 3SIG remained within the configured Study targets.',
        runs: ['Run 3', 'Run 4'],
        wafers: ['W01', 'W02', 'W03'],
      },
      {
        number: 1,
        date: '2026-08-31',
        author: 'Lee Seunghyun',
        title: 'D035 candidate reduced variation',
        summary:
          'The material revision change produced a meaningful improvement before the final energy adjustment.',
        runs: ['Run 2', 'Run 3'],
        wafers: ['W02', 'W03'],
      },
    ],
  },
  'cmp-stability': {
    slug: 'cmp-stability',
    id: 'EXP-014',
    name: 'CMP Stability',
    experimentType: 'Process Experiment',
    area: 'CMP',
    owner: 'Park Mina',
    organization: 'Semiconductor R&D · Planarization',
    createdAt: '2026-08-18',
    updatedAt: '2026-09-11',
    status: 'Active',
    runCount: 12,
    intent: {
      purpose: 'Stabilize post-CMP thickness across wafer positions.',
      hypothesis:
        'Pad selection and pressure control can reduce DELTA_THK variation.',
    },
    targets: [
      {
        id: 'target-delta-thk',
        parameter: 'DELTA_THK',
        rule: '≤ 6.0',
        unit: 'nm',
        achieved: 4,
        total: 5,
      },
      {
        id: 'target-thk',
        parameter: 'POST THK',
        rule: '495 – 505',
        unit: 'nm',
        achieved: 5,
        total: 5,
      },
    ],
    defaults: [
      {
        group: 'Process / Operation Plan',
        items: [{ label: '01', value: 'M2 CU CMP', context: 'CMP' }],
      },
      {
        group: 'Recipe',
        items: [
          {
            label: 'CMP recipe',
            value: 'CMP_RCP_03',
            context: 'M2 CU CMP',
            role: 'FIXED',
          },
        ],
      },
      {
        group: 'Conditions',
        items: [
          {
            label: 'Pressure',
            value: '3.0 psi',
            context: 'M2 CU CMP · Operation',
            role: 'VARIED',
          },
        ],
      },
      {
        group: 'Material / Sample',
        items: [
          {
            label: 'Sample',
            value: 'D035 Rev.2',
            context: 'Wafer default · exact revision',
            role: 'FIXED',
          },
        ],
      },
      {
        group: 'Resources / Consumables',
        items: [
          {
            label: 'Pad',
            value: 'PAD_A',
            context: 'M2 CU CMP · Operation',
            role: 'VARIED',
          },
          {
            label: 'Slurry',
            value: 'SLURRY_X',
            context: 'M2 CU CMP · Operation',
            role: 'FIXED',
          },
          {
            label: 'Disk',
            value: 'DISK_01',
            context: 'M2 CU CMP · Operation',
            role: 'FIXED',
          },
        ],
      },
      {
        group: 'Measurement Plan',
        items: [
          {
            label: 'Thickness Metrology',
            value: 'PRE THK · POST THK',
            context: 'PRE + POST · acquisition source selected later',
          },
        ],
      },
    ],
    runs: [
      {
        number: 12,
        name: 'Pad split stability check',
        date: '2026-09-11',
        updated: 'Yesterday 14:18',
        wafers: 4,
        delta: [
          'Pad A / B / C / D',
          'Pressure 3.0 → 3.5 psi',
          'THK POST added',
        ],
        unchanged: 9,
        evaluation: 'Needs review',
        nextAction: 'Additional Measurement',
        lifecycle: 'MEASUREMENT',
        runStatus: 'IN_PROGRESS',
        workspaceHref:
          '/series/cmp-stability/runs/12/engineering-grid?view=measurement',
      },
      {
        number: 11,
        name: 'Pad B / Pressure 3.5',
        date: '2026-09-05',
        updated: 'Sep 05',
        wafers: 5,
        delta: [
          'Pressure 3.0 → 3.5 psi',
          'W03/W05 Pad A → Pad B',
          'Derived DELTA_THK added',
        ],
        unchanged: 11,
        evaluation: 'Better',
        nextAction: 'Additional Analysis',
        lifecycle: 'EVALUATION',
        runStatus: 'COMPLETED',
        workspaceHref: null,
      },
      {
        number: 10,
        name: 'Pad A / Pressure 3.0',
        date: '2026-09-03',
        updated: 'Sep 03',
        wafers: 5,
        delta: ['Slurry flow 190 → 200 mL/min'],
        unchanged: 12,
        evaluation: 'Similar',
        nextAction: 'Retry with Changed Conditions',
        lifecycle: 'EVALUATION',
        runStatus: 'COMPLETED',
        workspaceHref: null,
      },
      {
        number: 9,
        name: 'Pad A baseline',
        date: '2026-08-30',
        updated: 'Aug 30',
        wafers: 4,
        delta: ['Initial full snapshot'],
        unchanged: 0,
        evaluation: 'Similar',
        nextAction: 'Design Next Experiment',
        lifecycle: 'EVALUATION',
        runStatus: 'COMPLETED',
        workspaceHref: null,
      },
    ],
    summaries: [
      {
        number: 2,
        date: '2026-09-05',
        author: 'Park Mina',
        title: 'Pad B improved thickness stability',
        summary:
          'Wafer overrides using Pad B reduced derived DELTA_THK at the higher pressure setting.',
        runs: ['Run 10', 'Run 11'],
        wafers: ['W03', 'W05'],
      },
      {
        number: 1,
        date: '2026-08-30',
        author: 'Park Mina',
        title: 'Baseline window established',
        summary:
          'The initial run established the PRE/POST thickness range for subsequent comparison.',
        runs: ['Run 9'],
        wafers: ['W01', 'W02', 'W03', 'W04'],
      },
    ],
  },
};
