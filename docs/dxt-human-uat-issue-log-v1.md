# DXT Human UAT v1 — 이슈 로그

2026-09-27 준비본. **사람 세션 0, 사람에게서 수집된 이슈 0.** 아래 사전 점검은 인간 사용성 결과와 별개다. 기존 자동화 보고서의 오래된 이슈를 현재 재현 없이 다시 OPEN하지 않는다.

연결 문서: [UAT 시나리오](dxt-human-uat-v1.md), [실시간 기록 양식](dxt-human-uat-execution-template-v1.md).

## 분류 및 운영

- **P0:** 필수 과제 불가능, 데이터 무결성 위험, 심각한 과학적 오해. 종속 과제를 중단하고 재검증한다.
- **P1:** 주요 사용성 방해, 오해를 부르는 용어, 과도하고 혼란스러운 절차.
- **P2:** 간격/버튼 위치/가벼운 문구 등 polish.
- **ENHANCEMENT:** 미래 기능이며 v1 필수 범위가 아닌 요청. Join, Merge, Formula, Calculate, Pivot, Outlier, advanced data preparation, defect legacy integration, 확장 Next Action을 이 항목으로 분리한다.

원인 유형은 PRODUCT / ENVIRONMENT / DATA / ROLE / UNKNOWN으로 별도 기록한다. 기능 부족을 데이터 준비 문제만으로, 필수 참여 편집을 단순 미래 enhancement로 바꿔 수용 처리하지 않는다. 스크린샷만으로 심각도를 확정하지 않고 실제 과제 영향과 의미 오류를 근거로 삼는다.

상태: OPEN → TRIAGED → FIX_PROPOSED → READY_FOR_RETEST → CLOSED. 제품 변경은 이 문서 작성 범위 밖이다. CLOSED에는 재현했던 조건으로 실제 재검증 증거가 필요하다. 중복은 원본 ID와 linked scenario만 추가한다. 미실행은 결함 없음이 아니다.

## 사전 점검 차단 항목 — 사람 발견 수에 포함하지 않음

### PRE-01 — 공정별 participation 편집 경로 미확인

- 출처: 2026-09-27 agent read-only preflight + 현재 소스 확인.
- 관련: HU-10, HU-11, HU-33 / 상태 OPEN / 원인 PRODUCT / 범위 심각도 **P0 (필수 과제 수행 불가)**.
- 재현 맥락: PHOTO20 Plan, W01–W04. 공정 행은 참여 개수/표시를 렌더링한다. `engineering-grid.tsx` operation row의 subject cell은 participation 표시이며 onChange/toggle 제어가 아니다. Focus 안내도 saved Plan/participation을 바꾸지 않는다고 명시한다.
- 관찰: 현재 사용자 화면에서 한 공정의 특정 웨이퍼 참여를 바꾸는 경로가 확인되지 않음. Scope에서 Subject를 고르는 것과 Operation별 참여 편집은 다르다.
- 기대: 다른 공정/전체 Run membership을 바꾸지 않고 해당 Operation의 참여 집합 편집 및 재확인.
- 영향: 요청된 필수 사람 과제는 현 화면으로 완료할 수 없음. 현재 저장 데이터가 손상됐다는 주장은 아님.
- 다음 조치/담당: 제품 담당자 지정 필요. 기존 정식 경로가 있는지 확인하거나 명시적 후속 구현 범위를 결정. 지금 코드를 수정하지 않음.
- 재검증: HU-10 → HU-11 → HU-33 순서; exact membership와 미참여/Missing 구분 확인.

### PRE-02 — 25장 및 사용자 공정 생성 사전조건 부족

- 관련 HU-11/HU-33 / OPEN / DATA + PRODUCT STATE / **BLOCKER; 사용자 공정 생성 불가가 확정되면 P0**.
- 근거: 현재 Study Default preview와 PHOTO20은4대상/3공정. A/B/C와 재합류 공정 추가 UI 경로는 확인되지 않음.
- 필요한 준비: 기존 승인 reference를 이용한 격리25장 상태, 실제 공정 ID 대응, 사용자 추가 경로 확인. 미리 심은 공정을 사용자가 생성한 것으로 세지 않음.
- 한계: 4장 완료는 25장 효율/수평 스크롤/분기·재합류 수용 증거가 아님.
- 담당: 제품/테스트 데이터 담당 지정 필요. 신규 과학 데이터·권한·fixture는 이번 작업에서 만들지 않음.

### PRE-03 — 쓰기 세션 대상·입력 카드 미지정

- 관련 HU-04/05/12/14/24/29/30/37 / OPEN / ENVIRONMENT·DATA 준비 공백 / 심각도 미부여.
- 기존 localhost3200은 이전 격리 UAT 자료가 있으나 반복 인간 세션용 disposable Run과 승인 입력 카드가 아직 지정되지 않음.
- 생성 원본·세션 고유 이름·허용 명령·측정 자료 출처·기준값·보관 방법을 정한 뒤 WRITE_REQUIRED 과제 실행. 이전 근거를 삭제/초기화하지 않음.
- 이것은 현재 제품 저장 기능이 실패했다는 판정이 아님. 전제 없이 저장하지 않아 BLOCKED인 세션은 product FAIL과 분리한다.

### PRE-04 — 목표 미달 및 풍부한 차트 비교 자료 부족

- 관련 HU-35 및 HU-23 해석 범위 / OPEN / DATA / 심각도 미부여.
- PHOTO saved analysis는1점/3누락. 적절한 기존 Not Met 기록은 이번 점검에서 확보하지 못함.
- 승인된 기존 자료 제공 전 Not Met 실제 화면 수용과 추세/분포 분석 유용성 판단을 보류. 그래프가 열리는 것과 연구에 충분한 것은 다름.
- 현재 값을 바꾸거나 목표를 낮추거나 높여 해당 상태를 만들지 않는다.

### PRE-05 — 조회 전용 세션 제공 여부 미확인

- 관련 HU-36 / OPEN / ROLE / 심각도 미부여.
- 현재 공유 관리 비활성. Header 이름은 principal 권한 증명이 아니다.
- 적법하게 준비된 별도 reader session 및 모든 source 접근을 확인한 뒤 수행. 현재 권한을 바꿔 시험하지 않는다.

위 사전 점검에는 필수 작업 차단으로 분류한 P0 1건(PRE-01)이 있다. 나머지는 준비 공백/확인 필요 항목이며 인간 FAIL이나 결함 수로 자동 합산하지 않는다. 동일 PRE-01이 세 과제에 영향을 주더라도 고유 이슈는1건이다.

## 사람 세션에서 우선 관찰할 위험 — 아직 결함 판정 아님

- Focus 보기/Scope/Subject Jump/participation 구분.
- Fixed / Intentionally Varied / Changed / inherited의 혼동.
- Actual의 빈 override와 실행 근거 없음의 차이; 입력부의 과거 기본 날짜를 검토하는지.
- Target Met이 자동 연구 승인/실험 종료라는 오해.
- Save Evaluation과 별도 결론 저장의 경계, 라디오 선택만 하고 저장됐다고 생각하는지.
- Inspector와 출처/대표값/원시값 발견, 좁은 글씨와 수평 스크롤.
- Study Setup의 자동저장, 비활성 package와 pin readiness 표기.
- Material 화면에서 Wafer/Site 용어 누출 또는 단위 혼합.
- 한국어/영어 버튼 의미와 실제 행동의 일치.
- Header의 현재 표시 이름과 Study Overview의 담당자 이름 차이를 역할 관계로 이해하는지. 현재 개요는 Lee Seunghyun, header는 오나은을 표시하며 동일 인물이어야 한다고 가정하지 않는다.
- Excel로 돌아가려는 이유가 v1 필수 작업 실패인지, Join/Pivot 등 미래 기능 요구인지.

## 새로운 이슈 카드 — 발견마다 복사

### HU-I___ — 짧고 구체적인 제목

- 발견 날짜 / Session / 익명 참가자 / Persona / Locale: ___
- Scenario IDs: ___ / route·선택 Study/Run/Subject: ___
- 출처: HUMAN OBSERVATION / AGENT PREFLIGHT / AUTOMATED / 환경 확인
- 분류: P0 / P1 / P2 / ENHANCEMENT / 확인 전
- 원인 유형: PRODUCT / ENVIRONMENT / DATA / ROLE / UNKNOWN
- 상태 / 담당자 / 다음 검토일: ___
- 사전조건·실제 실행 단계(최소 재현): ___
- Expected: ___
- Observed: ___
- 참가자 원문 인용: “___”
- Evidence·타임코드·정확한 참조: ___
- 잘못 클릭한 수 / 멈춤 시간 / 도움 수준 / Excel fallback: ___
- 과제/과학적 의미/데이터에 미친 영향: ___
- 심각도 근거: ___
- 안전 중단·보존 조치: ___ (없으면 없음; 승인 없는 수정 금지)
- 중복 원본/관련 이슈: ___
- 제안(구현 아님): ___
- 제품 판단: v1 필수 / 미래 enhancement / 환경 준비 / 미결
- 재검증 절차와 통과 조건: ___
- 재검증 날짜·사람·빌드·결과·증거: ___
- 종료 판단 및 승인자: ___

## 라운드 집계 (실제 세션 후 작성)

- 실제 사람 수 ___ / 세션 수 ___ / 과제 시도 ___
- PASS ___ / ASSISTED ___ / FAIL ___ / BLOCKED ___ / NOT_RUN ___
- 사람에게서 발견한 고유 P0 ___ / P1 ___ / P2 ___ / ENHANCEMENT ___
- 사전 차단 항목 잔여 ___ (사람 이슈와 별도)
- 상위 UX 위험과 인용 근거 ___
- Excel fallback 과제/이유 ___
- 사용성 재검증 범위 ___ / 전체 수용 여부·판단자 ___

현재 값은 채우지 않는다. 세션 미실시를 모든 과제 통과 또는 사용자 불만 없음으로 보고하지 않는다.
