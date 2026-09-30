# DXT Human UAT v1

작성/사전 점검: 2026-09-27 (Asia/Seoul). **사람 세션 미실시: 0명 / 0과제 완료.** 준비 상태는 PASS가 아니다. 이 문서는 이전 자동화 UAT 결과를 사람의 승인으로 전환하지 않는다.

목표는 실제 연구원이 과도한 설명이나 Excel 우회 없이 Study → Run Creation → Plan → Actual → Measurement → Analysis → Evaluation → Complete Run / Create Next Run을 수행하고, 결과의 출처와 의미를 설명할 수 있는지 확인하는 것이다. 제품 코드·동작·권한·과학 데이터는 이 준비 작업에서 변경하지 않았다.

## 실행 준비 요약

총 **37개**: **READY 12**, **ROLE_REQUIRED 1**, **SAFE_LOCAL_INTERACTION 12**, **STATE_REQUIRED 4**, **WRITE_REQUIRED 8**.

READ_ONLY 관찰만 뜻하는 READY와 SAFE_LOCAL_INTERACTION을 합친 **24개**는 새 과학 데이터 없이 시작할 수 있다. WRITE_REQUIRED **8개**는 생성/저장 허가와 세션 전용 데이터 지정 후 실행한다. STATE_REQUIRED **4개** 및 ROLE_REQUIRED **1개**는 사전조건이 없어 현재 보류한다. 상태 보류 중 HU-10/11/33은 조건이 갖춰져도 영속 검증에 쓰기가 필요하므로, 전체 쓰기 필요 과제는 **11개(직접 8 + 조건부 3)**이다. 분류는 각 과제의 주된 준비 상태 하나를 사용하며 이 조건부 수는 중복 합산하지 않는다.

**판정: PARTIALLY READY.** 감독하의 조회/로컬 조작 인간 UAT는 지금 시작 가능. 전체 쓰기 E2E 및 25장 분기·재합류 수용은 아직 시작 조건 미충족. SSO를 이번 로컬 감독 세션의 선행 조건으로 추가하지 않는다. 실제 사내 사용자 인증·권한 승인이나 외부 배포 준비를 뜻하지 않는다.

## 3개 페르소나

- **A — 반도체 공정 연구원:** 25장 FOUP에서 일부 웨이퍼를 공정별로 나누고 다시 같은 공정에 보내며 노광 조건·장비·레시피를 비교한다. 평소 Excel에서 대상을 열로 관리한다. 시스템 설계 지식은 전제하지 않는다.
- **B — 계측/분석 연구원:** 들어온 dataset의 대상/단위/집계/출처를 확인하고 Table, Line, Bar, Scatter를 선택해 결과를 비교한다. 저장 분석을 동료가 재검토할 수 있는지 관심이 있다.
- **C — 재료 R&D 연구원:** Specimen의 배합·도포·경화·시험과 Peel Force/Viscosity를 다룬다. Wafer/Site나 MES를 알아야만 사용할 수 있으면 실패 신호다.

페르소나는 업무 목적이지 권한 부여 방식이 아니다. 기존 테스트 principal의 접근만 사용한다. Header의 ‘오나은’ 표시는 인증된 개인 identity 증명이 아니다.

## 환경/실제 데이터 확인

Base URL: http://localhost:3200/ . 2026-09-27 읽기 점검으로 스터디 목록, Study Setup, Study Default preview, PHOTO20 Plan, 저장 분석, Material4 계측, CMP13 계측을 재확인했다. PHOTO19 잠금/Actual/Evaluation 및 KO/EN 화면은 직전 UI 검증에서도 확인했다. 이 점검 중 미리보기와 탐색만 했으며 Create/Save/권한 변경은 하지 않았다.

- **DTS Improvement:** Run19 기존 근거, Run20 편집 가능한 다음 Plan. 두 Run 모두 현재 목록의 4대상 W01–W04 맥락. Study Default preview도 4대상, COAT → EXPOSURE → CD-SEM, Energy36 mJ/cm²/Varied, Focus0 µm/Fixed. Run20 Focus1, Energy W01=37/W02–04=36, Changed1 표시. ‘Changed1’은 이 준비 작업이 수정했다는 뜻이 아니다.
- **PHOTO19:** 기존 Plan37/Actual38 Energy 차이, W01 BCD17.05 nm, S01 SITE 관측과 대표 결과; 목표16.8–17.2 nm. W02–04 결과 누락. 실제 새로운 관측이 아니다.
- **CMP Stability:** Run13 근거, Run14 다음 Plan. THK PRE W01=550 nm / THK POST W01=500 nm, 별도 dataset 2개. 자동 delta를 가정하지 않는다.
- **Adhesion Material Optimization:** Run4 근거, Run5 다음 Plan. SP-01–04; SP-01 FINAL Peel Force24 N / Viscosity920 cP, SUBJECT 관측2개; 다른 대상은 누락. 기존 평가 목표는 Peel Force≥22 N.
- **Saved Analysis:** `analysis-view-d7bd3bc8-97cf-4646-aa85-2cf85072ebe8`, 이름 `UAT v1 PHOTO BCD 17.05`. 재열기 시 PHOTO19, MEAN, LINE, 4대상, 1표시/3누락. 기본 신규 분석 Table과 구별. 현재 공유 관리는 비활성.
- Setup은 `config-package-photo-v1`을 비활성으로 표시하면서 현재 정확한 pin의 preview readiness는 준비됨으로 표시한다. 이 차이를 숨기거나 package를 activate하지 않는다. 생성 전 실제 미리보기 readiness를 다시 확인한다.

이 값들은 이전 격리 UAT에서 작성된 소프트웨어 검증 자료이며 과학적 유효성/제품 품질 주장이 아니다. 그 이력은 [기존 UAT 보고서](dxt-uat-execution-report-v1.md), [기존 근거](evidence/uat-v1/native-lifecycle.json)에 있다. 이전 문서의 오래된 UI 설명/91개 PASS 집계를 현재 사람 테스트 결과로 복사하지 않는다.

### 공통 사전조건과 안전한 경계

- **R — 조회:** 해당 route와 기존 source 접근 가능, 세션 시작값 기록. Setup은 조회만 한다. 입력 변경/참조 선택이 자동 저장되는 경로가 있으므로 ‘Save를 안 누르면 안전’이라고 일반화하지 않는다.
- **L — 임시 입력:** 현재 Plan cell은 dirty React 상태, Engineer Comment는 저장 전 초안이다. 이 두 경로만 임시 편집을 허용한다. Save/의도 전환/Scope Confirm은 누르지 않는다. 재진입하여 원래 값이 남는지 확인하고 다음 참가자에게 초안을 넘기지 않는다. 실제 자동 저장이 관찰되면 즉시 중단한다.
- **W — 영속 쓰기:** 별도 세션 Run/분석 이름/원본 refs/권한/승인된 입력 카드가 지정되어야 한다. 이 문서의 기존 Run19/20/4/5/13/14를 임의로 덮어쓰지 않는다. 세션 간 같은 가변 Run을 공유하지 않는다. 새 Run 번호는 서버가 부여하므로 미리21/6 등으로 단정하지 않는다. 파일 준비만으로 실제 쓰기를 수행할 권한이나 과학적 승인으로 간주하지 않는다.
- 저장 한 번은 쓰기이다. 분석 저장도 scientific raw copy는 아니지만 영속 맥락 쓰기이다. 성공 피드백과 재조회 확인을 분리 기록한다. 실패를 해결하려고 API/SQL/권한 우회나 데이터 재시드를 하지 않는다.
- UI가 지원하지 않는 대상/공정 등록을 facilitator가 DB에서 대신 수행해 ‘사용자 완료’로 세지 않는다. 선택 취소와 기존 값 복원은 이미 쓴 근거를 삭제하는 reset 절차가 아니다.

### 준비 공백

- **G1:** 현재 Engineering Grid의 공정별 참여는 읽기 표시이며 직접 변경 경로가 확인되지 않는다. Focus/Scope/Subject Jump는 공정별 participation editor가 아니다. HU-10/11/33은 BLOCKED. 관련 소스: `src/features/run-registration/engineering-grid.tsx`의 operation row, `participatesInOperation` 및 focus 안내.
- **G2:** 현재 서버 UAT PHOTO는 4장이다. 실제 25장 FOUP/기존 승인 실험 정의를 이용한 격리 fixture가 필요하다. legacy 25장 화면을 서버 UAT 저장 증거로 대체하지 않는다.
- **G3:** A/B/C와 재합류 공정 추가의 사용자 authoring 경로는 현재 화면에서 확인되지 않는다. 공정 5개를 미리 심어 놓고 ‘사용자가 공정을 생성했다’고 평가하지 않는다. 별도 제품 결정/명시적 후속 작업 전 보류한다.
- **G4:** 현 자료로 Target Met과 Missing은 가능하지만 적합한 Target Not Met 화면은 미확보. 충분한 multi-point trend/Scatter 분포 해석도 현 sparse data만으로 수용할 수 없다. 승인된 기존 자료를 확보하며 값을 조작해 그래프를 채우지 않는다.
- **G5:** 조회 전용 실제 세션 제공 여부 미확인. 권한을 내려서 시험하거나 미승인 PRIVATE 접근을 만들지 않는다.

## 시나리오 실행 방식

아래 **User task만 참가자에게 읽어준다.** Expected/observation/fail은 facilitator 전용이다. 시작 URL은 길찾기 실패 시 복구점이며, 정상 세션은 이전 과제에서 자연스럽게 이동한다. 직접 URL을 알려줬으면 assisted로 기록한다. Persona C의 공통 과제는 같은 라우트 패턴의 Material4/5와 Material 스터디로 바꾸되 결과/단위를 바꾸지 않는다.

READY = 기존 정보 조회, SAFE_LOCAL_INTERACTION = 검색·선택·뷰 변경·안전한 미저장 초안, WRITE_REQUIRED = 지정 후 저장 필요, ROLE_REQUIRED = 별도 기존 권한 세션 필요, STATE_REQUIRED = 데이터/제품 상태 미충족. 준비 상태와 실제 결과(NOT_RUN/PASS/ASSISTED/FAIL/BLOCKED)는 별개다.

### HU-01 — 스터디 찾기

- **Scenario ID / Persona / Goal:** HU-01 / A/C / 스터디 찾기.
- **Readiness:** READY. **Starting URL / context:** [list](http://localhost:3200/studies). 쓰기 과제는 W의 전용 Run URL로 대체한다.
- **Preconditions:** 공통 R. 3개 스터디가 조회됨.
- **User task:** “자신의 실험이 DTS Improvement 또는 Adhesion Material Optimization에 있다고 합니다. 해당 스터디를 찾아 여세요.”
- **Expected observable result:** 의도한 스터디에 도착하고 이름을 말한다.
- **Critical observation points:** 검색과 목록 중 선택, Run과 Study 혼동, 첫 클릭까지 시간.
- **Fail conditions:** 다른 스터디를 자기 실험으로 인식하거나 도움 없이 찾지 못함.
- **Severity if failed:** P1. 조건이 없으면 FAIL 대신 BLOCKED를 기록하고 원인 이슈를 연결한다.

### HU-02 — 스터디의 목적과 현재 차수 파악

- **Scenario ID / Persona / Goal:** HU-02 / A/C / 스터디의 목적과 현재 차수 파악.
- **Readiness:** READY. **Starting URL / context:** [overview](http://localhost:3200/series/dts-improvement?view=overview). 쓰기 과제는 W의 전용 Run URL로 대체한다.
- **Preconditions:** 공통 R. HU-01 완료. C는 Material 스터디 개요 사용.
- **User task:** “동료에게 이 스터디의 목적과 현재 확인할 실험 차수를 설명하세요.”
- **Expected observable result:** 목적, 최근 차수, Setup과 실제 차수의 차이를 화면 근거로 설명한다.
- **Critical observation points:** 개요 정보 우선순위, 최근 기록과 새 계획 혼동.
- **Fail conditions:** 다른 차수의 결과를 현재 계획의 결과로 설명함.
- **Severity if failed:** P1. 조건이 없으면 FAIL 대신 BLOCKED를 기록하고 원인 이슈를 연결한다.

### HU-03 — 스터디 기본 설정 검토

- **Scenario ID / Persona / Goal:** HU-03 / A/C / 스터디 기본 설정 검토.
- **Readiness:** READY. **Starting URL / context:** [setup](http://localhost:3200/series/dts-improvement?view=setup). 쓰기 과제는 W의 전용 Run URL로 대체한다.
- **Preconditions:** 공통 R. 조회만 수행. 설정 입력은 자동 저장될 수 있으므로 변경 금지.
- **User task:** “다음 실험에 어떤 공정과 기본 조건이 이어지는지 확인하세요. 값을 바꾸지 마세요.”
- **Expected observable result:** PHOTO는 COAT/EXPOSURE/CD-SEM, Energy 36, Focus 0 및 원본 패키지 맥락을 확인한다.
- **Critical observation points:** Setup과 Run 편집 구분, inactive와 ready의 의미 질문, 상세 발견.
- **Fail conditions:** 기본값을 과거 Run 실측으로 오해하거나 실수로 설정 변경.
- **Severity if failed:** P1; 과거 사실 오인/원치 않는 저장은 P0. 조건이 없으면 FAIL 대신 BLOCKED를 기록하고 원인 이슈를 연결한다.

### HU-04 — Study Default로 새 차수 생성

- **Scenario ID / Persona / Goal:** HU-04 / A/C / Study Default로 새 차수 생성.
- **Readiness:** WRITE_REQUIRED. **Starting URL / context:** [new](http://localhost:3200/runs/new?series=dts-improvement&from=study-default). 쓰기 과제는 W의 전용 Run URL로 대체한다.
- **Preconditions:** 공통 W. 세션 전용 생성 대상, 생성 권한, 현재 preview readiness 확인.
- **User task:** “스터디 기본 설정으로 다음 실험을 준비하고 새 차수를 만드세요.”
- **Expected observable result:** 검토한 출처/대상/조건을 가진 새 차수의 Plan이 열림. 실제 할당 번호를 기록한다.
- **Critical observation points:** 출처 선택, 검토 발견, 생성 완료 확신과 중복 클릭.
- **Fail conditions:** 잘못된 출처 생성 또는 생성 불가; 기존 Run이 바뀜.
- **Severity if failed:** P0. 조건이 없으면 FAIL 대신 BLOCKED를 기록하고 원인 이슈를 연결한다.

### HU-05 — Previous Run으로 새 차수 생성

- **Scenario ID / Persona / Goal:** HU-05 / A/C / Previous Run으로 새 차수 생성.
- **Readiness:** WRITE_REQUIRED. **Starting URL / context:** [previous](http://localhost:3200/runs/new?series=dts-improvement). 쓰기 과제는 W의 전용 Run URL로 대체한다.
- **Preconditions:** 공통 W. HU-04와 별도 독립 분기. Previous는 실행 시 최신 Run을 의미하므로 실제 원본 번호 기록.
- **User task:** “직전 차수의 계획을 이어받아 다음 차수를 만드세요.”
- **Expected observable result:** 미리보기의 실제 원본과 생성된 Plan이 일치하고 이전 Run은 그대로다.
- **Critical observation points:** 직전 Run과 특정 Existing Run 차이, 실행/계측까지 복사됐다고 생각하는지.
- **Fail conditions:** 원본을 잘못 이해해 생성하거나 과거 근거가 새 실측으로 복제됨.
- **Severity if failed:** P0. 조건이 없으면 FAIL 대신 BLOCKED를 기록하고 원인 이슈를 연결한다.

### HU-06 — 생성 전에 상속 내용을 설명

- **Scenario ID / Persona / Goal:** HU-06 / A/C / 생성 전에 상속 내용을 설명.
- **Readiness:** SAFE_LOCAL_INTERACTION. **Starting URL / context:** [new](http://localhost:3200/runs/new?series=dts-improvement&from=study-default). 쓰기 과제는 W의 전용 Run URL로 대체한다.
- **Preconditions:** 공통 R. 생성 버튼은 누르지 않음. 미리보기는 읽기 요청.
- **User task:** “기본 설정과 이전 차수 시작을 비교하고 무엇을 이어받는지 설명한 후 생성을 취소하세요.”
- **Expected observable result:** 패키지, 대상, 공정, 값/의도/출처를 비교하며 새 Run 없이 돌아온다.
- **Critical observation points:** Focus 기본 0과 Run 20의 1 차이; Changed와 Varied를 같은 것으로 보는지.
- **Fail conditions:** 근거 없이 값 상속을 추정하거나 취소가 생성으로 이어짐.
- **Severity if failed:** P1; 의도하지 않은 생성은 P0. 조건이 없으면 FAIL 대신 BLOCKED를 기록하고 원인 이슈를 연결한다.

### HU-07 — 공정 계층에서 작업 찾기

- **Scenario ID / Persona / Goal:** HU-07 / A / 공정 계층에서 작업 찾기.
- **Readiness:** SAFE_LOCAL_INTERACTION. **Starting URL / context:** [plan](http://localhost:3200/series/dts-improvement/runs/20/engineering-grid?view=plan). 쓰기 과제는 W의 전용 Run URL로 대체한다.
- **Preconditions:** 공통 R. Plan 20, W01–W04.
- **User task:** “노광 조건을 검토하고 앞뒤 공정을 확인한 뒤 전체 흐름으로 돌아오세요.”
- **Expected observable result:** EXPOSURE와 하위 조건을 구별하고 보기/접기 상태만 변경한다.
- **Critical observation points:** Focus/Experiment/Full History와 Scope 혼동, 고정 열, 수평 이동.
- **Fail conditions:** 보기 변경을 공정 삭제나 참여 변경으로 오해함.
- **Severity if failed:** P1. 조건이 없으면 FAIL 대신 BLOCKED를 기록하고 원인 이슈를 연결한다.

### HU-08 — 계획값 하나 수정해 보기

- **Scenario ID / Persona / Goal:** HU-08 / A/C / 계획값 하나 수정해 보기.
- **Readiness:** SAFE_LOCAL_INTERACTION. **Starting URL / context:** [plan](http://localhost:3200/series/dts-improvement/runs/20/engineering-grid?view=plan). 쓰기 과제는 W의 전용 Run URL로 대체한다.
- **Preconditions:** 공통 L. Run 20은 현재 편집 가능. approved test value를 세션 카드에 기입; 저장 금지. C는 Material Run 5.
- **User task:** “지정된 한 대상의 계획값을 변경하고 아직 저장되지 않았음을 확인한 뒤 취소하세요.”
- **Expected observable result:** 변경 표시와 저장 가능 상태가 보이고, 페이지 재진입 후 원래 저장값 유지.
- **Critical observation points:** 셀 진입, 키보드/Tab, 의도하지 않은 다중 셀 변경, 변경값 추적.
- **Fail conditions:** 잘못된 대상 수정 또는 임시 수정이 저장됐다고 오인.
- **Severity if failed:** P1; 실제 잘못된 저장은 P0. 조건이 없으면 FAIL 대신 BLOCKED를 기록하고 원인 이슈를 연결한다.

### HU-09 — 고정·의도적 변경·상속 변경 구분

- **Scenario ID / Persona / Goal:** HU-09 / A/C / 고정·의도적 변경·상속 변경 구분.
- **Readiness:** READY. **Starting URL / context:** [plan](http://localhost:3200/series/dts-improvement/runs/20/engineering-grid?view=plan). 쓰기 과제는 W의 전용 Run URL로 대체한다.
- **Preconditions:** 공통 R. PHOTO Energy는 Varied, Focus는 Fixed; Run 20의 Changed 표시.
- **User task:** “어떤 변수를 의도적으로 비교하고, 어떤 값은 이전 차수와 달라졌지만 고정인지 설명하세요.”
- **Expected observable result:** Fixed/Intentionally Varied/Changed를 별개로 설명하고 출처를 근거로 든다.
- **Critical observation points:** 표시 기호만 암기하는지, 동일 값이면 Fixed라고 단정하는지.
- **Fail conditions:** Changed를 자동으로 실험 변수 의도라고 해석.
- **Severity if failed:** P0 if scientific interpretation is wrong. 조건이 없으면 FAIL 대신 BLOCKED를 기록하고 원인 이슈를 연결한다.

### HU-10 — 한 공정의 웨이퍼 참여 변경

- **Scenario ID / Persona / Goal:** HU-10 / A / 한 공정의 웨이퍼 참여 변경.
- **Readiness:** STATE_REQUIRED. **Starting URL / context:** [plan](http://localhost:3200/series/dts-improvement/runs/20/engineering-grid?view=plan). 쓰기 과제는 W의 전용 Run URL로 대체한다.
- **Preconditions:** G1: 현재 4장 그리드는 참여 표시만 확인됨. 참여 편집 경로 미확인. 준비/제품 결정 전 BLOCKED; 완료하려면 W도 필요.
- **User task:** “지정된 공정에서 W03만 제외하고 다른 공정의 참여는 유지하세요.”
- **Expected observable result:** 준비 후 대상 공정만 미참여가 되고 값 누락과 구별된다.
- **Critical observation points:** 셀 선택/Jump/Scope를 참여 편집으로 착각하는지.
- **Fail conditions:** 공정별 참여를 바꿀 수 없음, 전체 Run에서 대상 제거, 미참여를 Missing으로 표시.
- **Severity if failed:** P0: required task impossible/data integrity. 조건이 없으면 FAIL 대신 BLOCKED를 기록하고 원인 이슈를 연결한다.

### HU-11 — 여러 웨이퍼의 참여 효율적으로 지정

- **Scenario ID / Persona / Goal:** HU-11 / A / 여러 웨이퍼의 참여 효율적으로 지정.
- **Readiness:** STATE_REQUIRED. **Starting URL / context:** [plan](http://localhost:3200/series/dts-improvement/runs/20/engineering-grid?view=plan). 쓰기 과제는 W의 전용 Run URL로 대체한다.
- **Preconditions:** G1+G2: 25장 전용 상태 및 참여 편집 필요. 현재 상태로 실행하지 않음; 완료 시 W 필요.
- **User task:** “한 공정에 지정된 다섯 대상만 참여하도록 가장 빠른 방법으로 지정하세요.”
- **Expected observable result:** 정확한 대상 집합을 재확인하며 반복 입력을 최소화한다.
- **Critical observation points:** 클릭 수, 범위/다중선택, 되돌리기, Excel 대비 시간.
- **Fail conditions:** 지원 경로 부재로 완료 불가 또는 비선택 웨이퍼가 포함됨.
- **Severity if failed:** P0 if impossible/wrong membership; P1 if excessive effort. 조건이 없으면 FAIL 대신 BLOCKED를 기록하고 원인 이슈를 연결한다.

### HU-12 — 계획 저장과 재진입 확인

- **Scenario ID / Persona / Goal:** HU-12 / A/C / 계획 저장과 재진입 확인.
- **Readiness:** WRITE_REQUIRED. **Starting URL / context:** [plan](http://localhost:3200/series/dts-improvement/runs/20/engineering-grid?view=plan). 쓰기 과제는 W의 전용 Run URL로 대체한다.
- **Preconditions:** 공통 W. 반드시 세션 전용 editable Run URL로 대체. 승인된 변경 1개만 입력.
- **User task:** “수정한 계획을 저장하고 화면을 나갔다 돌아와 유지 여부를 확인하세요.”
- **Expected observable result:** 성공 피드백과 재조회 값 일치, 다른 대상/원본 Run 불변.
- **Critical observation points:** Save Plan 위치, dirty와 Saved 구분, 반복 클릭.
- **Fail conditions:** 성공처럼 보이지만 소실/중복/다른 값 저장.
- **Severity if failed:** P0. 조건이 없으면 FAIL 대신 BLOCKED를 기록하고 원인 이슈를 연결한다.

### HU-13 — 실행 근거가 있는 계획의 잠금 이해

- **Scenario ID / Persona / Goal:** HU-13 / A/C / 실행 근거가 있는 계획의 잠금 이해.
- **Readiness:** READY. **Starting URL / context:** [locked](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=plan). 쓰기 과제는 W의 전용 Run URL로 대체한다.
- **Preconditions:** 공통 R. PHOTO 19에는 downstream evidence 존재.
- **User task:** “이전 계획값을 수정할 수 있는지 확인하고 수정이 필요하면 어떻게 할지 설명하세요.”
- **Expected observable result:** Plan read-only를 발견하고 Actual 또는 다음 차수와 구별한다.
- **Critical observation points:** 권한 부족과 evidence lock 혼동, 입력처럼 보이는 비활성 셀.
- **Fail conditions:** 실행 근거 이후 Plan을 덮어쓸 수 있거나 Actual 수정을 Plan 수정으로 오인.
- **Severity if failed:** P0. 조건이 없으면 FAIL 대신 BLOCKED를 기록하고 원인 이슈를 연결한다.

### HU-14 — 실제 수행 내용 기록

- **Scenario ID / Persona / Goal:** HU-14 / A/C / 실제 수행 내용 기록.
- **Readiness:** WRITE_REQUIRED. **Starting URL / context:** [actual](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=actual). 쓰기 과제는 W의 전용 Run URL로 대체한다.
- **Preconditions:** 공통 W. HU-12의 세션 Run 및 지정 대상/공정. 승인된 수행 기록/시간과 override 제공. 기존 19에 덧쓰지 않음.
- **User task:** “지정된 실제 수행 내역을 기록하고 계획과 차이를 확인하세요.”
- **Expected observable result:** 새 execution 근거가 지정 공정/대상에 저장, Plan은 유지됨.
- **Critical observation points:** Save Actual이 여는 입력부, 날짜 기본값 검토, 대상 선택 이유, 한 번 저장 인지.
- **Fail conditions:** 잘못된 대상/시각/실제값 저장 또는 Plan 변경.
- **Severity if failed:** P0. 조건이 없으면 FAIL 대신 BLOCKED를 기록하고 원인 이슈를 연결한다.

### HU-15 — Actual 공란의 의미 설명

- **Scenario ID / Persona / Goal:** HU-15 / A/C / Actual 공란의 의미 설명.
- **Readiness:** SAFE_LOCAL_INTERACTION. **Starting URL / context:** [actual](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=actual). 쓰기 과제는 W의 전용 Run URL로 대체한다.
- **Preconditions:** 공통 R. 입력 패널 열기/취소만. override 선택을 비우는 UI는 저장하지 않음.
- **User task:** “계획대로 수행한 경우와 실제 기록 자체가 없는 경우가 어떻게 다른지 설명하세요.”
- **Expected observable result:** 기록 시 빈 override는 해당 항목의 Plan 사용; 기록 자체 부재는 미기록임을 구별한다. 0을 공란으로 취급하지 않는다.
- **Critical observation points:** 빈 값=0/미참여/실행 완료라는 오해.
- **Fail conditions:** 근거 없이 모든 공란을 실행 완료로 판단.
- **Severity if failed:** P0. 조건이 없으면 FAIL 대신 BLOCKED를 기록하고 원인 이슈를 연결한다.

### HU-16 — 계획과 다른 실행 찾기

- **Scenario ID / Persona / Goal:** HU-16 / A/B / 계획과 다른 실행 찾기.
- **Readiness:** SAFE_LOCAL_INTERACTION. **Starting URL / context:** [actual](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=actual). 쓰기 과제는 W의 전용 Run URL로 대체한다.
- **Preconditions:** 공통 R. PHOTO19 W01 Energy Plan37/Actual38 기존 근거.
- **User task:** “계획과 다르게 수행된 조건을 찾고 원래 계획과 비교하세요.”
- **Expected observable result:** Differs from Plan 필터에서 Energy 차이를 찾고 같은 차수의 Plan으로 이동한다.
- **Critical observation points:** 필터=데이터 수정 오해, Changed와 Varied 혼동, 빈 셀 수 해석.
- **Fail conditions:** 실제 차이를 반대로 설명하거나 필터 결과를 전체 집단으로 일반화.
- **Severity if failed:** P1; scientific misinterpretation P0. 조건이 없으면 FAIL 대신 BLOCKED를 기록하고 원인 이슈를 연결한다.

### HU-17 — 계측 결과 및 누락 파악

- **Scenario ID / Persona / Goal:** HU-17 / B/C / 계측 결과 및 누락 파악.
- **Readiness:** READY. **Starting URL / context:** [measurement](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=measurement). 쓰기 과제는 W의 전용 Run URL로 대체한다.
- **Preconditions:** 공통 R. PHOTO19 BCD17.05 nm; W02–W04 누락. C는 Material4.
- **User task:** “계측된 대상과 아직 결과가 없는 대상을 알려주세요.”
- **Expected observable result:** 측정값/단위/대상과 Missing을 구별한다.
- **Critical observation points:** 0과 대시, 미참여와 미수집, 몇 개 대상인지.
- **Fail conditions:** Missing을 0이나 목표 미달로 해석.
- **Severity if failed:** P0. 조건이 없으면 FAIL 대신 BLOCKED를 기록하고 원인 이슈를 연결한다.

### HU-18 — 실험 대상 수준과 Site 수준 구분

- **Scenario ID / Persona / Goal:** HU-18 / B/C / 실험 대상 수준과 Site 수준 구분.
- **Readiness:** SAFE_LOCAL_INTERACTION. **Starting URL / context:** [measurement](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=measurement). 쓰기 과제는 W의 전용 Run URL로 대체한다.
- **Preconditions:** 공통 R. PHOTO19 기존 S01 SITE 근거; Material4 SUBJECT 근거와 비교.
- **User task:** “이 값이 웨이퍼 전체를 대표하는지 특정 위치의 관측인지 확인하고 Material 화면과 비교하세요.”
- **Expected observable result:** Site→Wafer→Run→Study 맥락을 유지하고 Specimen에는 불필요한 Site를 요구하지 않는다.
- **Critical observation points:** 원시값과 대표값 혼동, Site를 독립 실험 대상으로 인식.
- **Fail conditions:** 위치 관측을 독립 웨이퍼로 집계하거나 Material에 Wafer/Site 필수 입력 요구.
- **Severity if failed:** P0. 조건이 없으면 FAIL 대신 BLOCKED를 기록하고 원인 이슈를 연결한다.

### HU-19 — 계측 상세 찾기

- **Scenario ID / Persona / Goal:** HU-19 / B/C / 계측 상세 찾기.
- **Readiness:** SAFE_LOCAL_INTERACTION. **Starting URL / context:** [measurement](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=measurement). 쓰기 과제는 W의 전용 Run URL로 대체한다.
- **Preconditions:** 공통 R. 결과 셀 존재.
- **User task:** “17.05 nm 결과의 자세한 근거를 찾아보고 원래 작업 화면으로 돌아오세요.”
- **Expected observable result:** 셀/Details로 우측 Inspector를 열고 닫으며 선택을 유지한다.
- **Critical observation points:** Inspector 발견까지 시간, 핵심 편집도 여기라고 생각하는지.
- **Fail conditions:** 상세를 찾지 못하거나 돌아올 때 맥락 상실.
- **Severity if failed:** P1. 조건이 없으면 FAIL 대신 BLOCKED를 기록하고 원인 이슈를 연결한다.

### HU-20 — 출처를 동료에게 설명

- **Scenario ID / Persona / Goal:** HU-20 / B/C / 출처를 동료에게 설명.
- **Readiness:** READY. **Starting URL / context:** [analysis](http://localhost:3200/analysis?study=dts-improvement&runs=19&parameters=parameter-bcd-v1). 쓰기 과제는 W의 전용 Run URL로 대체한다.
- **Preconditions:** 공통 R. HU-19 방식으로 선택 상세 접근 가능.
- **User task:** “이 수치가 어디에서 왔는지 동료가 다시 확인할 수 있도록 설명하세요.”
- **Expected observable result:** Study/Run/Subject, dataset 및 대표 결과 참조, 단위/집계/원시 출처를 가리킨다.
- **Critical observation points:** 사용자 말로 source/derived/representative 설명, confidence1–5.
- **Fail conditions:** 수동 값과 장비 수집을 혼동하거나 다른 dataset을 근거로 사용.
- **Severity if failed:** P0. 조건이 없으면 FAIL 대신 BLOCKED를 기록하고 원인 이슈를 연결한다.

### HU-21 — 분석할 데이터 범위 선택

- **Scenario ID / Persona / Goal:** HU-21 / B / 분석할 데이터 범위 선택.
- **Readiness:** SAFE_LOCAL_INTERACTION. **Starting URL / context:** [analysis](http://localhost:3200/analysis?study=dts-improvement&runs=19&parameters=parameter-bcd-v1). 쓰기 과제는 W의 전용 Run URL로 대체한다.
- **Preconditions:** 공통 R. PHOTO19 및 Material4/CMP13 기존 source. 저장 안 함.
- **User task:** “DTS의 특정 차수·데이터셋·BCD·W01을 분석하도록 범위를 좁히세요.”
- **Expected observable result:** Study/Run/Dataset/Parameter/Subject 선택 결과가 실제 행과 일치한다.
- **Critical observation points:** scope disclosure 발견, 필터와 삭제 혼동, 선택 개수와 실제 데이터.
- **Fail conditions:** 범위를 좁혔다고 생각하지만 다른 source가 포함됨.
- **Severity if failed:** P1; wrong scientific conclusion P0. 조건이 없으면 FAIL 대신 BLOCKED를 기록하고 원인 이슈를 연결한다.

### HU-22 — 표에서 먼저 결과 검토

- **Scenario ID / Persona / Goal:** HU-22 / B / 표에서 먼저 결과 검토.
- **Readiness:** READY. **Starting URL / context:** [analysis](http://localhost:3200/analysis?study=dts-improvement&runs=19&parameters=parameter-bcd-v1). 쓰기 과제는 W의 전용 Run URL로 대체한다.
- **Preconditions:** 공통 R. savedView 없는 기본 분석 URL.
- **User task:** “그래프를 보기 전에 비교할 값과 단위를 표에서 확인하세요.”
- **Expected observable result:** 기본 Table에서 W01 17.05와 다른 대상 누락을 설명한다.
- **Critical observation points:** 표 기본값, 행/열 밀도, 필요한 식별 열, Excel 복사 욕구.
- **Fail conditions:** 숫자와 단위를 잘못 연결하거나 대상 식별 불가.
- **Severity if failed:** P1. 조건이 없으면 FAIL 대신 BLOCKED를 기록하고 원인 이슈를 연결한다.

### HU-23 — 그래프 선택과 한계 판단

- **Scenario ID / Persona / Goal:** HU-23 / B / 그래프 선택과 한계 판단.
- **Readiness:** SAFE_LOCAL_INTERACTION. **Starting URL / context:** [analysis](http://localhost:3200/analysis?study=dts-improvement&runs=19&parameters=parameter-bcd-v1). 쓰기 과제는 W의 전용 Run URL로 대체한다.
- **Preconditions:** 공통 R. PHOTO는 실제 점1개/누락3개. 풍부한 추세 데이터 없음.
- **User task:** “같은 자료를 Line, Bar, Scatter로 검토하고 이 자료로 말할 수 없는 결론도 알려주세요.”
- **Expected observable result:** 뷰마다 값/단위가 같고 sparse data를 추세 증거로 과장하지 않는다.
- **Critical observation points:** 축/그룹/누락 표시, 차트 점→Inspector, Excel로 돌아갈 이유.
- **Fail conditions:** 단일 점을 추세로 확신하거나 계측값이 시각화 전환으로 바뀜.
- **Severity if failed:** P0 if scientific misunderstanding; P1 discoverability. 조건이 없으면 FAIL 대신 BLOCKED를 기록하고 원인 이슈를 연결한다.

### HU-24 — 분석 맥락 저장

- **Scenario ID / Persona / Goal:** HU-24 / B / 분석 맥락 저장.
- **Readiness:** WRITE_REQUIRED. **Starting URL / context:** [analysis](http://localhost:3200/analysis?study=dts-improvement&runs=19&parameters=parameter-bcd-v1). 쓰기 과제는 W의 전용 Run URL로 대체한다.
- **Preconditions:** 공통 W. 세션 고유 분석 이름, 기존 Saved Analysis 갱신 금지. 결과값 쓰기가 아닌 saved-context write.
- **User task:** “지금 선택한 범위와 보기를 나중에 재검토할 수 있도록 저장하세요.”
- **Expected observable result:** 새 Saved Analysis가 생성되고 정확한 source refs/config가 유지됨.
- **Critical observation points:** Save Analysis와 Update 구분, 완료 피드백, 공유를 저장과 혼동.
- **Fail conditions:** 기존 공유 분석 덮어쓰기 또는 source 맥락 누락.
- **Severity if failed:** P0. 조건이 없으면 FAIL 대신 BLOCKED를 기록하고 원인 이슈를 연결한다.

### HU-25 — 저장된 분석 다시 열기

- **Scenario ID / Persona / Goal:** HU-25 / B / 저장된 분석 다시 열기.
- **Readiness:** READY. **Starting URL / context:** [saved](http://localhost:3200/analysis?savedView=analysis-view-d7bd3bc8-97cf-4646-aa85-2cf85072ebe8). 쓰기 과제는 W의 전용 Run URL로 대체한다.
- **Preconditions:** 공통 R. 기존 UAT v1 PHOTO BCD 17.05 사용; 공유 관리 비활성은 예상.
- **User task:** “저장된 분석을 열고 어떤 데이터와 보기가 복원됐는지 확인하세요.”
- **Expected observable result:** 기존 LINE/MEAN, Run19, 4대상, 17.05와 exact source refs가 복원됨.
- **Critical observation points:** default Table과 saved Line 차이, 최신 데이터로 자동 교체된다고 생각하는지.
- **Fail conditions:** 다른 source로 재해석하거나 단순 screenshot 저장으로 오해.
- **Severity if failed:** P0. 조건이 없으면 FAIL 대신 BLOCKED를 기록하고 원인 이슈를 연결한다.

### HU-26 — 평가 결과 요약 읽기

- **Scenario ID / Persona / Goal:** HU-26 / A/B/C / 평가 결과 요약 읽기.
- **Readiness:** READY. **Starting URL / context:** [evaluation](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=evaluation). 쓰기 과제는 W의 전용 Run URL로 대체한다.
- **Preconditions:** 공통 R. W01; C는 Material4 evaluation.
- **User task:** “연구원 의견을 보기 전에 결과와 목표를 설명하세요.”
- **Expected observable result:** PHOTO17.05 nm와16.8–17.2 nm 또는 Material24 N와≥22 N를 구별한다.
- **Critical observation points:** 자동판정 위치, 단위, 평가 대상 선택.
- **Fail conditions:** 다른 대상의 결과나 결론을 현재 대상으로 인식.
- **Severity if failed:** P0. 조건이 없으면 FAIL 대신 BLOCKED를 기록하고 원인 이슈를 연결한다.

### HU-27 — 자동 목표 판정과 연구원 의견 구분

- **Scenario ID / Persona / Goal:** HU-27 / A/B/C / 자동 목표 판정과 연구원 의견 구분.
- **Readiness:** READY. **Starting URL / context:** [evaluation](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=evaluation). 쓰기 과제는 W의 전용 Run URL로 대체한다.
- **Preconditions:** 공통 R. W01 achieved, W02 missing; 실제 Not Met 별도 HU-35.
- **User task:** “목표 달성과 연구원의 수용 의견이 같은 것인지, W02는 어떤 상태인지 설명하세요.”
- **Expected observable result:** 자동 target assessment와 engineer judgment를 분리하고 Missing은 Not Met이 아니라고 설명.
- **Critical observation points:** 판정 직접 수정 시도, 자동판정을 연구 승인으로 오해.
- **Fail conditions:** 목표 달성을 연구원 승인 또는 실험 종료로 단정.
- **Severity if failed:** P0. 조건이 없으면 FAIL 대신 BLOCKED를 기록하고 원인 이슈를 연결한다.

### HU-28 — 연구원 코멘트 초안 작성

- **Scenario ID / Persona / Goal:** HU-28 / A/C / 연구원 코멘트 초안 작성.
- **Readiness:** SAFE_LOCAL_INTERACTION. **Starting URL / context:** [evaluation](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=evaluation). 쓰기 과제는 W의 전용 Run URL로 대체한다.
- **Preconditions:** 공통 L. W01 실제 결과 사용, 저장 금지. 기존 코멘트 원문 기록.
- **User task:** “이 결과를 어떻게 해석하는지 짧게 작성하고 저장 전 상태를 확인한 뒤 취소하세요.”
- **Expected observable result:** textarea 초안만 바뀌고 재진입 시 기존 저장 코멘트 그대로.
- **Critical observation points:** Engineer Comment와 Decision/Rationale 구별, 초안 유실 인지.
- **Fail conditions:** 임시 입력이 자동 저장됐다고 오인하거나 다른 대상에 적용.
- **Severity if failed:** P1. 조건이 없으면 FAIL 대신 BLOCKED를 기록하고 원인 이슈를 연결한다.

### HU-29 — 평가 저장

- **Scenario ID / Persona / Goal:** HU-29 / A/C / 평가 저장.
- **Readiness:** WRITE_REQUIRED. **Starting URL / context:** [evaluation](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=evaluation). 쓰기 과제는 W의 전용 Run URL로 대체한다.
- **Preconditions:** 공통 W. 세션 Run의 실제 계측/대표 결과 준비(HU-37), 지정 평가 권한. 기존19 평가 변경 금지.
- **User task:** “판정과 독립된 본인의 연구원 의견을 저장하고 다시 확인하세요.”
- **Expected observable result:** 선택 결과에 대한 평가가 저장되고 자동 target/원시값 불변.
- **Critical observation points:** Save Evaluation 오른쪽 발견, 코멘트와 결론 저장 경계.
- **Fail conditions:** 평가 저장이 원시 관측이나 자동 목표 판정을 수정.
- **Severity if failed:** P0. 조건이 없으면 FAIL 대신 BLOCKED를 기록하고 원인 이슈를 연결한다.

### HU-30 — 차수 종료 또는 다음 차수로 이어가기

- **Scenario ID / Persona / Goal:** HU-30 / A/C / 차수 종료 또는 다음 차수로 이어가기.
- **Readiness:** WRITE_REQUIRED. **Starting URL / context:** [evaluation](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=evaluation). 쓰기 과제는 W의 전용 Run URL로 대체한다.
- **Preconditions:** 공통 W. HU-29와 판단/후속조치 권한. 두 분기는 서로 다른 전용 Run.
- **User task:** “한 실험은 종료로 판단하고, 다른 실험은 지정 조건만 바꾼 다음 차수로 이어가세요.”
- **Expected observable result:** 종료는 기존 결론/후속 조치 명령으로 기록. 다음 차수는 preview 검토 후 생성되어 Plan으로 연결; 이전 근거는 불변.
- **Critical observation points:** 라디오 선택 자체와 저장 구별, 별도 결론 저장, preview/create, 반복 입력.
- **Fail conditions:** 생성 불가/중복 생성/이전 Run 변경, 종료 판단을 모든 실제 공정 완료로 오인.
- **Severity if failed:** P0. 조건이 없으면 FAIL 대신 BLOCKED를 기록하고 원인 이슈를 연결한다.

### HU-31 — 한국어 핵심 흐름 재수행

- **Scenario ID / Persona / Goal:** HU-31 / A/B/C / 한국어 핵심 흐름 재수행.
- **Readiness:** SAFE_LOCAL_INTERACTION. **Starting URL / context:** [list](http://localhost:3200/studies). 쓰기 과제는 W의 전용 Run URL로 대체한다.
- **Preconditions:** 공통 R. KO 선택, 다른 언어와 동일 기존 Run/대상. 쓰기 과제는 다시 저장하지 않음.
- **User task:** “한국어로 스터디→차수→계획→실제→계측→분석→평가를 이동하고 동일 결과를 찾아 설명하세요.”
- **Expected observable result:** 레이아웃·ID·숫자·단위·데이터가 같고 라벨만 한국어로 바뀜.
- **Critical observation points:** 용어 질문/줄바꿈/버튼 잘림; 첫 언어 순서 기록.
- **Fail conditions:** 번역으로 과학적 의미가 바뀌거나 버튼이 접근 불가.
- **Severity if failed:** P1; meaning/data change P0. 조건이 없으면 FAIL 대신 BLOCKED를 기록하고 원인 이슈를 연결한다.

### HU-32 — 영어 핵심 흐름 재수행

- **Scenario ID / Persona / Goal:** HU-32 / A/B/C / 영어 핵심 흐름 재수행.
- **Readiness:** SAFE_LOCAL_INTERACTION. **Starting URL / context:** [list](http://localhost:3200/studies). 쓰기 과제는 W의 전용 Run URL로 대체한다.
- **Preconditions:** 공통 R. EN 선택. HU-31과 동일 대상; 2번째 사용의 학습효과 기록.
- **User task:** “영어로 같은 흐름을 이동하고 원본 결과와 저장 동작 위치를 찾아 설명하세요.”
- **Expected observable result:** KO와 같은 데이터/동작에 대응하며 한국어로도 다시 전환 가능.
- **Critical observation points:** 번역 누락/클리핑/문법, Save 용어 일관성.
- **Fail conditions:** 별도 데이터/로직으로 보이거나 잘못된 버튼 선택 유발.
- **Severity if failed:** P1; meaning/data change P0. 조건이 없으면 FAIL 대신 BLOCKED를 기록하고 원인 이슈를 연결한다.

### HU-33 — 25장 FOUP 분기·재합류 작업

- **Scenario ID / Persona / Goal:** HU-33 / A / 25장 FOUP 분기·재합류 작업.
- **Readiness:** STATE_REQUIRED. **Starting URL / context:** [plan](http://localhost:3200/series/dts-improvement/runs/20/engineering-grid?view=plan). 쓰기 과제는 W의 전용 Run URL로 대체한다.
- **Preconditions:** G1+G2+G3. 전용25장/5공정 fixture와 참여 편집/공정 생성 경로 필요. 현재 Run20 대체 증거 불가; 완료 시 W 필요.
- **User task:** “이전 공정 W01–W15에서 A=01/03/05/07/09, B=02/04/06/08/10, C=11–15로 분기하고 이후 공정에서 W01–W15가 다시 참여하도록 구성하세요.”
- **Expected observable result:** 아래 전용 절차의 정확한 집합·조건·출처가 보존되며 Split Group 수동 생성 없이 완료.
- **Critical observation points:** Excel 비교 시간, 다중 선택, 상속에 의한 절감, lineage 설명, 미참여와 누락.
- **Fail conditions:** 현재처럼 참여 편집/공정 생성 경로가 없으면 BLOCKED; 잘못된 집합/소실은 FAIL.
- **Severity if failed:** P0 required task impossible/data integrity. 조건이 없으면 FAIL 대신 BLOCKED를 기록하고 원인 이슈를 연결한다.

### HU-34 — Material 흐름으로 동일 의미 확인

- **Scenario ID / Persona / Goal:** HU-34 / C / Material 흐름으로 동일 의미 확인.
- **Readiness:** READY. **Starting URL / context:** [material](http://localhost:3200/series/adhesion-material-optimization/runs/4/engineering-grid?view=measurement). 쓰기 과제는 W의 전용 Run URL로 대체한다.
- **Preconditions:** 공통 R. Material4 기존 SP-01–04, MATERIAL_RND; Plan5는 편집 상태 조회용.
- **User task:** “배합 연구의 수행·계측·분석·평가 흐름을 검토하고 웨이퍼 없이 설명하세요.”
- **Expected observable result:** MIX/COAT/CURE/TEST, Peel Force24 N, Viscosity920 cP, Specimen 맥락을 유지한다.
- **Critical observation points:** Wafer/Lot/Site 용어 누출, formulation 식별, 단위 혼합, 같은 컴포넌트 이해.
- **Fail conditions:** Specimen을 Wafer로 처리하거나 Site/장비 인터페이스가 필수.
- **Severity if failed:** P0 if blocks valid material work; P1 wording. 조건이 없으면 FAIL 대신 BLOCKED를 기록하고 원인 이슈를 연결한다.

### HU-35 — 목표 미달을 실제 화면에서 해석

- **Scenario ID / Persona / Goal:** HU-35 / A/B/C / 목표 미달을 실제 화면에서 해석.
- **Readiness:** STATE_REQUIRED. **Starting URL / context:** [evaluation](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=evaluation). 쓰기 과제는 W의 전용 Run URL로 대체한다.
- **Preconditions:** G4: 현재 조회한 UAT 결과에는 적절한 Not Met 근거 미확보. 과거 승인 자료/별도 fixture 필요. 목표를 바꿔 상태를 만들지 않음.
- **User task:** “결과가 목표를 충족하지 못한 대상을 찾아, 누락 및 연구원 의견과 구별해 설명하세요.”
- **Expected observable result:** 실제 Result/Target에서 Not Met을 읽으며 Missing/Rejected와 구분.
- **Critical observation points:** 달성/미달 색상 의존, 단위와 경계 조건.
- **Fail conditions:** 미달을 데이터 오류/누락과 혼동하거나 결론을 자동으로 강제.
- **Severity if failed:** P0. 조건이 없으면 FAIL 대신 BLOCKED를 기록하고 원인 이슈를 연결한다.

### HU-36 — 조회만 가능한 동료에게 전달

- **Scenario ID / Persona / Goal:** HU-36 / B / 조회만 가능한 동료에게 전달.
- **Readiness:** ROLE_REQUIRED. **Starting URL / context:** [saved](http://localhost:3200/analysis?savedView=analysis-view-d7bd3bc8-97cf-4646-aa85-2cf85072ebe8). 쓰기 과제는 W의 전용 Run URL로 대체한다.
- **Preconditions:** G5: 사전 제공된 적법한 조회 전용 principal/session과 전체 source 접근 필요. 현재 세션의 권한을 변경하지 않음.
- **User task:** “동료가 저장 분석을 읽고 출처를 확인하되 실험을 수정하지 않도록 검토하세요.”
- **Expected observable result:** 허용된 자료만 보이며 저장/과학 쓰기 제한을 이해한다.
- **Critical observation points:** 권한 제한과 Plan 잠금 구별, 공유 audience AND source 접근.
- **Fail conditions:** 권한 밖 데이터 노출 또는 허용되지 않은 저장.
- **Severity if failed:** P0. 조건이 없으면 FAIL 대신 BLOCKED를 기록하고 원인 이슈를 연결한다.

### HU-37 — 세션 전용 계측 기록

- **Scenario ID / Persona / Goal:** HU-37 / B/C / 세션 전용 계측 기록.
- **Readiness:** WRITE_REQUIRED. **Starting URL / context:** [measurement](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=measurement). 쓰기 과제는 W의 전용 Run URL로 대체한다.
- **Preconditions:** 공통 W. HU-14 이후 적합한 실행 근거; approved measurement card의 기존 관측/단위/시각/대상 제공. 가짜 실측 생성 금지.
- **User task:** “지정된 관측 자료를 계측으로 기록하고 그 결과를 분석과 평가에서 찾아보세요.”
- **Expected observable result:** 올바른 Subject/Site grain와 exact source가 기록되어 동일 값으로 Analysis/Evaluation 연결.
- **Critical observation points:** Save Measurement 입력부 발견, 측정시각/단위/대표값, 이중 저장.
- **Fail conditions:** 다른 대상/단위/분석 단위에 기록 또는 source 유실.
- **Severity if failed:** P0. 조건이 없으면 FAIL 대신 BLOCKED를 기록하고 원인 이슈를 연결한다.

## HU-33 상세: FOUP 분기·재합류

현재 **BLOCKED**. 단순히 fixture만 만들면 참여 편집/공정 생성 UX까지 생기는 것은 아니다. 제품/데이터 준비 완료를 별도로 확인한 뒤 이 과제를 시작한다. 이번 준비 작업에서는 fixture, operation, permission, scientific result를 생성하지 않았다.

25개 Wafer ID를 가진 격리된 계획을 사용한다. W16–W25는 이 실험 공정에서 미참여다. 원래 Lot/Subject ID와 과거 pin은 유지한다. 아래 A/B/C는 과제상의 별칭이며 새로운 과학적 공정명을 발명하는 지시가 아니다. 실제 적용 공정은 승인된 reference definitions 중 선정하고 행에 대응표를 기록한다.

1. 이전 공정 P의 참여 집합을 W01–W15로 준비/확인한다.
2. 세 다운스트림 공정을 사용자 흐름에서 추가한다. A에는 W01,W03,W05,W07,W09; B에는 W02,W04,W06,W08,W10; C에는 W11,W12,W13,W14,W15를 지정한다.
3. 이후 공정 D를 추가하여 W01–W15가 모두 다시 참여하도록 한다. W16–W25는 계속 제외한다. 공정 생성이 불가능하면 이 단계는 끝난 것으로 세지 않는다.
4. 참가자가 각 행의 참여 수 P15/A5/B5/C5/D15와 대상 집합을 스스로 검산한다. A∩B=A∩C=B∩C=∅, A∪B∪C=P=D를 facilitator가 대조한다.
5. 상속된 공통 조건은 다시 입력하지 않고 필요한 승인 변경만 한다. 미참여 셀은 N/A로, 참여했으나 입력/계측 없는 셀은 Missing 또는 명시된 빈값으로 구별한다. 미참여에0을 넣지 않는다.
6. 지원되는 저장 경로로 저장 후 다시 열어 집합/의도/값/출처가 유지되는지 확인한다. explicit Split Group 생성이나 수동 lineage 분류를 요구하지 않는다. ‘재합류’는 후속 공정의 참여 집합이며 새로운 Merge 계산/데이터 합성 기능을 요구하지 않는다.
7. “어떤 웨이퍼가 어느 경로로 같은 공정에 왔나요?”라고 묻는다. UI가 provenance를 표시하지 않는 부분은 참가자의 추측을 성공 증거로 기록하지 않는다.

Excel 비교는 같은 승인 ID/입력 카드로 진행한다. 제품과 Excel 각각 완료 시간, 클릭/키 입력, 오류 대상 수, 반복 조건 입력 수를 측정한다. 절반은 Excel 먼저, 절반은 DXT 먼저 하거나 순서 효과를 기록한다. 안전한 익명화 자료만 쓰며 Excel 결과를 DXT에 업로드하지 않는다. DXT가 미완료이면 ‘빠름’으로 평가하지 않는다. n=2–3 결과는 기술통계/인용문으로 보고하고 일반적인 성능 우위를 주장하지 않는다.

## 첫 라운드: 2–3명, 30–60분/명

가능하면 A/B/C 각1명(총3명). 2명일 때 A와 B/C 업무를 실제로 모두 아는1명을 선택하고 Material 관찰이 없으면 미검증으로 남긴다. 사람에게 역할별 추가 권한을 부여해 세션을 맞추지 않는다.

**지금 권장하는 첫 세션(45분, 비쓰기):**

- 0–4분: 소개/동의/세션정보, 기존 source와 locale 확인.
- 4–11분: HU-01/02/03 — 스터디 찾기·개요·기본 설정.
- 11–15분: HU-06 — 상속 검토 후 취소.
- 15–23분: HU-07/09/13/16 — 공정·의도·잠금·Actual 차이.
- 23–31분: HU-17/19/20 — 계측/Inspector/출처.
- 31–37분: HU-22/23/25 — 표·차트·재열기.
- 37–42분: HU-26/27 — 자동판정/연구원 의견, 반대 언어로 HU-31 또는32의 핵심 경로 축약 반복.
- 42–45분: Excel로 돌아갈 시점, 자신감1–5, 가장 어려운3가지.

45분을 넘기면 HU-23의 모든 뷰와 언어 전체 반복은 미실시로 남긴다. 축약한 과제를 전체 PASS로 세지 않는다. **30분 축약:** HU-01/06/09/17/19/22/26/27와5분 회고. **B 중심:** HU-17–23/25/27. **C 중심:** HU-01–03을 Material로, HU-34/17–20/26–28. A의25장 과제는 준비되지 않았으므로 verbal discussion만 가능하며 실행 성공으로 세지 않는다.

**쓰기 E2E 후속 세션(60분):** W가 준비된 뒤 5분 briefing → HU-04 또는05/06(8분) →07/08/09/12(10분) →14/15/16(8분) →37/17/19(8분) →21/22/24/25(8분) →26/27/28/29/30의 한 분기(10분) →3분회고. 이전 Run 방식과 종료/다음차수 두 분기는 다른 참가자/세션에 분배한다. 25장 비교는 별도30–45분이 필요하며 한 시간 E2E에 억지로 넣지 않는다.

## Facilitator guide

**말할 것:** “여러분을 시험하는 것이 아니라 화면을 시험합니다. 평소 방식으로 작업하고, 무엇을 하려는지와 이해되지 않는 말을 소리 내어 말씀해주세요. 오늘은 지정된 조회/취소 범위만 진행합니다. 저장 과제는 별도로 표시됩니다. 정답을 추측할 필요가 없습니다.”

**설명하지 말 것:** 메뉴 위치/아이콘 의미/Inspector 여는 법/Fixed와 Changed의 정답, 개발 아키텍처, 예상 클릭 경로. ‘우측 버튼을 누르세요’ 대신 과제 목표만 읽는다. 오래된 자동화 PASS나 ‘대부분 완성됐다’는 설명으로 긍정 답변을 유도하지 않는다.

**도움 규칙:** 20초 이상 멈추면 hesitation 시점 기록, 약60초 진전이 없으면 “지금 무엇을 찾고 계신가요?”라는 중립 질문1회. 2분 이상 막히거나 참가자가 요청하면 먼저 현재 지점을 기록하고 도움 제공. L1 목표 재진술, L2 영역 힌트, L3 구체 조작/직접 URL로 구분한다. L2/L3 후 완료는 unassisted PASS가 아니다. 시간 제한은 성공 기준이 아니라 세션 운영 가이드다.

**즉시 개입:** 의도하지 않은 Save/Create/Setup 자동저장 가능성, 잘못된 대상/단위, 권한 밖 정보, 과학적 오해로 실제 기록하려는 순간에는 기다리지 말고 중단한다. 클릭 전 중단이면 실제 데이터 변경으로 적지 않는다. P0이면 종속 과제도 멈추고 근거를 남긴다.

**기록:** 실제 클릭과 기대 경로를 분리하고 시작/종료 시간·잘못 누른 위치·사용자 인용문·도움 수준을 남긴다. 버튼/셀/선택 항목 활성화는 클릭1회, 키보드/스크롤은 별도 기록한다. native dropdown 펼치기/선택도 실제 수행 그대로 센다. 생각하는 시간은 포함하고 로딩 대기는 따로 표시한다. 자신감은 provenance 과제 후1–5, Excel로 전환하려던 정확한 순간과 이유를 묻는다.

**낯섦 vs 제품 실패:** 처음 찾는 시간 자체를 결함으로 단정하지 않는다. 중립 힌트 후 재시도·유사 과제 전이를 관찰한다. 같은 용어에서 여러 사람이 잘못된 과학적 결론에 도달하거나 숙련 후에도 필수 행동이 막히면 제품 신호다. API/기능 부재나 broken action은 훈련 부족으로 돌리지 않는다. 잘못된 사전 데이터/권한은 환경 BLOCKED로, 실제 화면에서 실패한 과제는 FAIL로 구분한다. 확인 전 ‘사용자 실수’로 닫지 않는다.

## 분류·라운드 종료 기준

- **P0:** 필수 과제 수행 불가, 데이터 무결성 위험, 심각한 과학적 오해. 해당 흐름 중단 및 재검증 필요.
- **P1:** 주요 사용성 방해, 오해를 부르는 용어, 과도하거나 혼란스러운 절차. 도움 수준/빈도/시간과 함께 기록.
- **P2:** 간격, 버튼 배치, 가벼운 문구 등 개선. 필수 과제 수행/의미는 유지.
- **ENHANCEMENT:** v1 범위 밖 Join, Merge, Formula, Calculate, Pivot, outlier workflow, advanced data prep, defect legacy integration, expanded Next Action types. 별도 backlog이며 P0/P1 결함 수에 섞지 않는다. 단, 본 문서의 요구된 participation 과제를 미래 enhancement로 이름만 바꿔 통과 처리하지 않는다.

라운드 보고는 과제별 unassisted/assisted/failed/blocked와 실제 분모를 제시한다. 필수 흐름에서 P0가 남거나 25장 과제가 blocked이면 전체 Human UAT 수용 완료를 선언하지 않는다. 화면 관찰 라운드 종료와 제품 승인 결정은 별개다. 소수 참가자 결과를 성공률 일반화에 쓰지 않는다.

## 함께 사용할 파일

- [실행 기록 양식](dxt-human-uat-execution-template-v1.md)
- [이슈 로그](dxt-human-uat-issue-log-v1.md)
- [직전 UI 구현/검증 보고서](dxt-figma-lifecycle-final-implementation.md)

문서만 작성했다. 이 작업에서 신규 fixture/실험/계측/평가/권한을 만들지 않았고 제품 수정·테스트 결과 조작·기존 UAT 기록 덮어쓰기를 하지 않았다.
