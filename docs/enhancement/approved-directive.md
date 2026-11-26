# DXT LIMS — FINAL APPROVED IMPLEMENTATION DIRECTIVE

**Status: APPROVED FOR IMPLEMENTATION**
**Decision Authority: Product Owner + GPT Product Design Office**
**Scope: Existing Product Enhancement**

---

## 0. Executive Direction

Product Owner가 D01~D04 검토안과 전체 개발 방향에 동의했으며 다음 추가 업무 정책도 최종 승인했다.

- D03: 미할당 Wafer가 있어도 Run 생성 및 저장 허용. Warning 표시.
- D05: Criteria가 정의되지 않은 Run도 연구자의 최종 판단 허용.
- D06: 최신 Revision뿐 아니라 과거 Revision을 복제하여 신규 Revision 생성 허용.

D01~D08의 업무 정책 결정이 완료되었다.

이제 추가적인 전체 분석이나 중복 설계 보고서 작성에 머무르지 말고 실제 기능 구현 및 검증을 진행한다.

본 작업은 기존 DXT LIMS를 재구축하는 프로젝트가 아니다. 기존 개발 실적을 유지하면서 제품의 업무 적합성, 화면 완성도 및 데이터 정합성을 개선하는 Enhancement다.

GPT는 다음 다섯 가지 전문 관점에서 본 지시서를 검토했다.

- IT / PI Consultant
- Solution Architect
- Screen Designer
- UI/UX Specialist
- Senior Developer

Codex는 승인된 업무 계약 내에서 최적의 기술적 대안을 자율적으로 선택하고 구현한다.

---

## 1. Protect Existing Product Baseline

기준 통합 PR:

- PR #26
- Branch: `codex/runtime-integration`
- HEAD: `90d7f94d3ea8fe4e2711265dfe62da1345a7516e`

기존 확인 실적:

- 통합 Commit 61개
- 변경 파일 163개
- 기존 제품 회귀 테스트 367 PASS 보고
- PostgreSQL 검증 PASS 보고
- Sample Revision 브라우저 검증 PASS 보고
- Human UAT READY / NOT RUN
- GitHub CI 미구성
- 기존 Activation 간헐적 오류 원인 미확정

위 수치는 기존 개발 실적이며 신규 Enhancement 완료 실적이 아니다.

### Mandatory Protection

1. PR #26의 기존 기능 및 UI 동결 상태를 유지한다.
2. 통합 HEAD 기반의 독립 Enhancement Branch 또는 Worktree를 생성한다.
3. 기존 미커밋 Phase 0 및 Phase 1 문서를 안전하게 보존한다.
4. 문서 작업 Branch와 구현 Branch의 기준 차이를 확인한다.
5. 기존 Human UAT DB와 운영 데이터를 변경하지 않는다.
6. 신규 구현 및 검증은 별도 개발·테스트 환경에서 진행한다.
7. 기존 통합 PR에 직접 변경을 추가하지 않는다.
8. 별도 승인 없이 병합 또는 운영 배포하지 않는다.
9. 현재 Git 상태가 기존 보고와 다르면 실제 상태를 기록하고 안전한 기준을 확인한다.

---

## 2. Governing Product Principles

기존 Product Constitution 및 Domain Architecture를 유지한다.

- Researcher First
- Loose Workflow, Strict Data
- Stable Core, Flexible Definitions
- Full State Storage, Delta-based UX
- Planned / Actual Separation
- Explicit Experiment Design
- Exact Revision Reference
- Measurement Provenance
- Scientific Authorization
- Configuration over Hardcoding

시스템은 연구자의 실험을 지원해야 하며 불필요한 절차를 강제해서는 안 된다.

단, 식별자·관계·권한·기록 불변성과 같은 데이터 정합성은 엄격하게 보호한다.

---

## 3. Final Approved Business Decisions

### D01. Explicit Split Group

- 동일 Operation Instance 내 복수 Split Group을 허용한다.
- Base 및 Split은 실제 실험 대상 집합이다.
- Base는 0..1개, Split은 복수 생성 가능하다.
- 사용자가 Group을 명시적으로 생성한다.
- 조건값이 동일하더라도 서로 다른 Group의 정체성을 유지한다.
- 동일 Operation Instance에서 하나의 Subject는 최대 하나의 Group에 소속된다.
- Operation 공통 조건은 Base 조건과 구분한다.
- Split Group은 Base를 자동 상속하지 않는다.
- 동일 Operation Definition을 반복 수행하면 독립적인 Instance를 생성한다.
- 공정 순서 변경만으로 기존 Instance ID를 변경하지 않는다.

### D02. Assignment Resolution

유효 조건값 해석 우선순위:

Subject Override → Group Assignment → Operation Common Assignment

- 값과 FIXED/VARIED 역할을 동일 Assignment에서 함께 해석한다.
- 미설정은 상위 조건 상속을 의미한다.
- 숫자 0과 Boolean false는 유효한 명시값이다.
- 유효하지 않은 명시값을 무시하고 상위 값으로 대체하지 않는다.
- Group 조건값을 Subject별로 복제 저장하지 않는다.
- Subject Override는 기본 업무가 아닌 예외 조건 관리 기능으로 제공한다.
- Group 이동 시 기존 Subject Override를 자동 삭제하지 않는다.
- Override 존재 여부와 최종 유효값의 원천을 확인할 수 있어야 한다.
- 명시적으로 Override를 해제할 수 있어야 한다.
- 기존 Legacy Run의 해석 계약을 유지한다.

Plan, Actual 비교, Delta, Analysis 등에서 동일한 조건 해석 서비스를 우선 재사용한다.

### D03. Skip and Incomplete Plan

Product Owner 최종 승인:

**미할당 대상이 있어도 Draft 및 Run 생성·저장을 허용한다.**

다음 업무 의미를 명확하게 구분한다.

- COMMON: 별도 Split 설계 없이 일반 공통 조건을 적용하는 공정.
- ASSIGNED: 명시적으로 Group에 소속된 대상.
- SKIP: 연구자가 명시한 계획상 공정 미수행.
- UNASSIGNED: Split 설계 대상이나 아직 Group이 결정되지 않은 상태.
- MISSING: 필요한 조건값 또는 데이터가 없는 상태.
- INVALID: 잘못된 데이터 타입, 식별자 또는 참조.

COMMON과 UNASSIGNED를 혼동하지 않는다.

UNASSIGNED 및 MISSING은 Warning으로 표시한다.

이러한 상태를 이유로 Run 생성·저장을 강제 차단하지 않는다.

데이터 정합성 오류 및 권한 위반은 기존 정책에 따라 차단한다.

위 의미를 표현하기 위해 불필요한 중복 상태 테이블을 만들지 않는다. 실제 기존 구조와 관계를 분석하여 최소한의 저장 모델을 선택한다.

기존 membership 부재를 자동으로 Skip 또는 Unassigned로 해석하지 않는다.

계획 Skip으로 Actual Event를 자동 생성하지 않는다.

계획 Skip 대상에 Actual 수행 기록이 존재하면 원본을 보존하고 계획과 실제의 불일치로 표시한다.

### D04. Recipe Source Parameter

- Recipe의 특정 Source Parameter에 SampleRevision을 연결한다.
- 정확한 Recipe Revision과 버전 고정 Parameter identity를 사용한다.
- Source Parameter당 0..1개의 SampleRevision을 지원한다.
- 여러 Source Parameter는 독립적으로 연결한다.
- Operation, Group, Subject 범위의 연결을 지원한다.
- 연결 미설정은 상속을 의미한다.
- 명시적 연결 해제는 CLEAR로 표현한다.
- 권한 제한에 의한 조회 불가 상태를 미설정 또는 CLEAR로 처리하지 않는다.
- Sample Code를 일반 문자열 Parameter Value로 저장하지 않는다.
- Recipe 변경 시 호환되지 않는 연결을 자동 이식하지 않는다.
- 신규 Sample Revision 생성으로 과거 Run의 참조가 변경되지 않는다.
- 기존 MaterialUsage와 SampleRevision 구조를 우선 재사용한다.
- 기존 불변 Recipe/Parameter identity가 있다면 중복 Master를 만들지 않는다.

외부 Recipe Master 연계와 단일 Source Parameter의 복수 소재 및 혼합비 관리는 이번 Scope에서 제외한다.

### D05. Run Final Judgment

Product Owner 최종 승인:

**Criteria가 정의되지 않았거나 개별 Evaluation이 완료되지 않은 Run도 연구자가 직접 최종 판단할 수 있다.**

- Criteria 설정 여부를 판단 저장의 필수조건으로 강제하지 않는다.
- 개별 결과 Evaluation 완료를 필수조건으로 강제하지 않는다.
- 모든 계측 항목의 결과 등록을 강제하지 않는다.
- 판단 근거는 선택 사항으로 유지한다.
- 기존 설정 기반 판단 선택지를 재사용한다.
- 새로운 고정 판단 Enum을 임의 추가하지 않는다.
- 판단 변경 시 기존 이력 정책을 유지한다.
- 기존 AUTHOR_DECISION 권한을 유지한다.
- Trusted attribution, CAS 및 재시도 보호를 유지한다.
- 기존 NextAction 및 과거 판단 기록을 보호한다.

현재 `decision.context_id NOT NULL` 제약과 관련 저장 Guard, 이력 조회, INNER JOIN, NextAction 계약을 함께 검토한다.

제약을 단순 제거하거나 가상의 Criteria 또는 Evaluation 데이터를 생성하여 정책을 우회하지 않는다.

근거가 존재하는 판단은 정확한 근거를 보존하고, 근거 없는 연구자 직접 판단도 정합성 있게 표현할 수 있는 최소 모델을 적용한다.

### D06. Sample Revision

Product Owner 최종 승인:

**최신 Revision뿐 아니라 연구자가 선택한 과거 Revision을 복제하여 신규 Revision을 생성할 수 있다.**

- 최초 Sample 등록 시 Revision 1 생성.
- Sample ID는 유지한다.
- 기존 Sample 및 Revision을 검색·선택할 수 있다.
- Revision 올리기 버튼을 명시적으로 제공한다.
- 최신 Revision을 기본 복제 원본으로 제공한다.
- 과거 Revision도 복제 원본으로 선택할 수 있다.
- 선택한 Revision의 조성·물성·특성 정보를 복제한다.
- 사용자가 변경 정보를 입력하고 신규 Revision으로 저장한다.
- Revision 번호는 Sample 내에서 순차 자동 생성한다.
- 복제 원본 Revision을 정확하게 기록한다.
- 변경 사유 입력을 제공하되 필수로 강제하지 않는다.
- 기존 Revision의 불변성을 유지한다.
- 기존 Run의 SampleRevision 참조 및 사용 이력을 보존한다.
- 기존 권한, 동시성 및 명령 재시도 보호를 재사용한다.
- 과거 데이터의 복제 원본을 이전 Revision 번호로 추정하지 않는다.

예시:

SAMPLE-001의 최신 Revision이 R2인 상태에서 사용자가 R1을 선택하여 복제하면 R3을 생성한다.

R3의 복제 원본은 R1이며 R2가 아니다.

신규 Revision 생성 후에도 기존 R1 및 R2를 참조하는 모든 Run은 변경되지 않는다.

### D07. Planned / Actual

- 기존 Planned / Actual 경계를 유지한다.
- Group, Recipe, Sample 및 조건 변경이 과거 Actual을 덮어쓰지 않는다.
- 계측 결과와 과거 판단의 근거를 변경하지 않는다.
- 기존 Snapshot 및 잠금 정책을 유지한다.
- 별도 중복 Execution Model을 만들지 않는다.
- 기존 실제 수행 및 계측 참조의 정합성을 보호한다.

### D08. Focus Filter

- 기존 Experiment Scope와 Manual Focus를 재사용한다.
- 집중 공정 Checkbox는 사용자 조회 설정이다.
- 집중 공정만 조회하는 필터를 제공한다.
- 전체 Operation 및 공정 순서를 유지한다.
- Focus 설정은 공정 수행 여부를 변경하지 않는다.
- Scope, Group Assignment, Skip, Actual 및 Measurement 데이터를 변경하지 않는다.
- 사용자의 수동 관심 공정과 기존 자동 Focus의 의미를 구분한다.

---

## 4. Screen and UX Specification

### 4.1 Existing Workspace

기존 Engineering Grid 및 Experiment Workspace를 개선한다.

중복 Workspace, 독립 애플리케이션 또는 불필요한 신규 메뉴를 만들지 않는다.

기존 Navigation, Design Token, Component, 한/영 표시 체계 및 화면 패턴을 재사용한다.

### 4.2 Main Screen Structure

- 기존 Run Context.
- 기존 업무 Navigation.
- Operation 검색 및 집중 공정 필터.
- Operation 중심 Engineering Grid.
- Base 및 Split Group 행.
- Wafer별 Group 할당 Cell.
- Recipe 및 주요 변경 조건 요약.
- 기존 Inspector 기반 상세 조건 및 소재 편집.

### 4.3 Operation Grid

Operation은 기본적으로 접힌 요약 행으로 표시한다.

연구자가 해당 Operation을 확장하면 Base, Split Group 및 대상 할당 상태를 확인할 수 있다.

일반 공정에 불필요한 Base/Split 행을 자동 생성하지 않는다.

1,000개 이상의 Operation을 관리하는 상황에서도 필요한 공정에 집중할 수 있도록 한다.

Operation 식별 컬럼과 헤더 고정을 우선 검토한다.

25개 Wafer 기준 수평 스크롤과 식별 가능성을 확보한다.

### 4.4 Group Interaction

다음 기능을 제공한다.

- Add Base
- Add Split Group
- Rename Group
- Duplicate Group Conditions
- Delete Group
- Assign Subject
- Reassign Subject
- Unassign Subject
- Set Skip
- Clear Skip
- Edit Recipe
- Edit Group Conditions
- View and Edit Subject Override

다른 Group에 이미 속한 Wafer를 재할당하면 기존 소속은 해제되고 신규 소속으로 이동한다.

사용자에게 이동 결과를 명확하게 보여준다.

Group 삭제 시 소속 대상의 처리 결과를 안내한다.

대상을 자동으로 Skip으로 변환하지 않는다.

### 4.5 Inspector

기존 Inspector를 활용하여 다음 정보를 표시하고 편집한다.

- Selected Operation
- Selected Group
- Recipe
- Parameter
- Value
- Unit
- FIXED/VARIED
- Assignment Source
- Source Parameter
- SampleRevision
- Subject Override

기본 Grid에서 모든 Parameter를 동시에 펼치지 않는다.

그룹 중심으로 업무를 수행하며 필요시 상세 Inspector에서 조건과 예외를 편집한다.

상속값과 명시값을 시각적으로 구분한다.

실제 유효값과 값의 원천을 확인할 수 있도록 한다.

### 4.6 Sample Revision UX

기존 Sample 목록 및 상세 화면을 재사용한다.

Sample 검색 → Revision 선택 → Revision 올리기 → 기존 정보 복제 → 변경 정보 입력 → 저장

Revision 생성 화면에 다음 정보를 명확하게 표시한다.

- Sample ID
- 복제 원본 Revision
- 신규 Revision 번호
- 기존 정보
- 변경 정보
- 변경 사유

과거 Revision을 복제하더라도 신규 번호가 최신 번호 다음으로 생성되는 것을 명확하게 표시한다.

### 4.7 Visual Quality

실제 제품 화면을 기준으로 다음 항목을 검토한다.

- 정보 계층
- 데이터 밀도
- Grid 정렬 및 컬럼 폭
- 공정명과 Wafer 식별자 가독성
- 선택 상태
- 편집 상태
- Warning 및 오류 메시지
- 빈 데이터 상태
- Loading 상태
- 권한 제한 상태
- 버튼의 명칭 및 일관성
- 한/영 전환
- 키보드 조작
- 수평·수직 스크롤

색상만으로 상태를 구분하지 않는다.

불필요한 Badge, Card, Modal 및 중복 정보를 최소화한다.

---

## 5. Implementation Work Packages

### WP-00. Baseline and Stable Operation Identity

우선 수행한다.

- 안전한 Enhancement Branch 또는 Worktree 생성.
- 기존 Phase 0/1 산출물 보존.
- 승인된 D01~D08 Decision Log 반영.
- run_operation 저장 방식 개선.
- 공정 순서 변경 및 일반 수정 시 기존 ID 유지.
- 삭제와 변경의 명확한 구분.
- 기존 참조 및 잠금 정책 유지.
- Transaction 및 동시성 보호.
- 기존 Run 호환 테스트.

불필요한 전체 도메인 리팩토링을 수행하지 않는다.

### WP-01. Split Group Vertical Slice

- Group CRUD.
- Base/Split identity.
- Subject Assignment.
- Skip/Unassigned.
- Operation Common과 Split 설계 구분.
- Group Recipe 및 Condition.
- Subject Override.
- 기존 Grid 및 Inspector 연결.
- API 및 PostgreSQL 영속화.
- 권한.
- Run 생성 및 상속.
- Delta 및 기존 조회 호환성.

Domain, DB, API, UI 및 테스트까지 완결된 수직 기능 단위로 구현한다.

### WP-02. Recipe Source and Sample Binding

- Source Parameter identity.
- Typed SampleRevision binding.
- Operation/Group/Subject scope.
- Inheritance 및 CLEAR.
- Recipe 변경 호환성.
- 권한에 의한 조회 제한.
- 기존 MaterialUsage 및 역추적 연계.
- 과거 Run 참조 보존.

### WP-03. Sample Revision Experience

- 기존 Revision 생성 기능 재사용.
- Revision 올리기 진입 동선 개선.
- 과거 Revision 복제 지원.
- 복제 원본 기록.
- 변경 정보 입력.
- 불변성 및 동시성 검증.

### WP-04. Run Judgment Enhancement

- 개별 Evaluation 필수 Gate 제거.
- Criteria 없는 판단 지원.
- 기존 판단 선택지 재사용.
- Decision History 보존.
- NextAction 호환성.
- 기존 Scientific Authorization 유지.

### WP-05. Researcher Workspace UX

- 집중 공정 Checkbox.
- 집중 공정 필터.
- 계측 항목 용어 통일.
- Group 중심 Grid.
- 상속값/Override 표시.
- Warning 및 상태 표현.
- 1,000개 이상 Operation 조회 및 편집 성능 개선.

계측 항목과 Evaluation Criteria는 서로 다른 개념이다.

평가 관련 모든 내부 모델과 용어를 일괄 Measurement로 변경하지 않는다.

### WP-06. Integrated Validation

- Wafer 공정실험.
- 소자실험.
- Specimen 실험.
- Sample 등록 및 Revision 생성.
- Recipe Source 연결.
- Plan/Actual 불일치.
- Measurement.
- Analysis.
- Run Judgment.
- NextAction.
- 권한 및 회귀 검증.

Specimen 실험에 Wafer 전용 Split 모델을 불필요하게 강제하지 않는다.

---

## 6. Efficient Execution Strategy

WP-00을 우선 수행한다.

Split Group 구현은 안정적인 Operation Identity 저장 계약을 전제로 진행한다.

Recipe Source Binding은 Group 및 Assignment 계약과 정합성을 확보한 후 연결한다.

Sample Revision, Run Judgment, 집중 공정 및 계측 용어 개선은 독립적으로 안전하게 진행할 수 있으면 병행 개발한다.

병행 개발 시 동일 파일, Schema 및 공통 컴포넌트 충돌을 통제한다.

기능별 작은 Commit과 검증 가능한 변경 단위를 사용한다.

Codex는 다음 사항을 자율적으로 결정한다.

- 내부 파일 구조.
- ID 생성 방식.
- FK 및 Index.
- Transaction.
- Schema 변경 방식.
- API 상세 계약.
- Component 재사용.
- 테스트 구성.
- 기술적 최적화.
- 비파괴적 결함 수정.

이미 확정된 업무 정책을 반복 질문하지 않는다.

업무 의미를 바꾸지 않는 일반적인 기술적 판단 때문에 전체 구현을 중단하지 않는다.

작업 도중 문제가 발견되면 독립적으로 진행 가능한 다른 Work Package를 계속 수행한다.

단, 업무 정책 충돌, 데이터 손실 위험, 권한 정책 변경, 동결 정책 해제 및 운영 영향은 Blocker로 분류한다.

---

## 7. Mandatory Acceptance Scenarios

기존 A01~A35 시나리오를 재사용하고 최종 D01~D08 결정에 맞게 수정한다.

최소한 다음 사항을 검증한다.

### Split Group

- 동일 Operation Definition 반복 수행의 독립 Instance 관리.
- 공정 순서 변경 후 ID 유지.
- Base 및 복수 Split Group 생성.
- 동일 조건값의 독립 Group 정체성 유지.
- Wafer 할당 및 재할당.
- 중복 Group 소속 방지.
- Group 삭제 후 참조 정합성.
- Skip과 미할당 구분.
- 일반 공정과 미할당 구분.
- 미할당 상태의 Run 생성 및 저장.
- Group 조건 변경의 정상적인 유효값 반영.
- Subject Override의 보존 및 해제.
- 0과 false의 정상 처리.
- Invalid 값의 자동 상속 방지.

### Recipe and Sample

- 정확한 Source Parameter identity.
- 정확한 SampleRevision 연결.
- 복수 Source Parameter 독립 연결.
- Inherit 및 CLEAR 구분.
- 권한 제한 상태의 안전한 처리.
- Recipe 변경 시 잘못된 소재 연결 방지.
- Sample 신규 등록 시 R1 생성.
- R1에서 R2 생성.
- R1을 복제하여 R3 생성.
- R3의 원본이 R1로 정확하게 기록.
- 과거 Run의 R1/R2 참조 유지.
- 동시 Revision 생성 및 재시도 보호.

### Judgment

- Criteria 없는 Run 판단 저장.
- 개별 Evaluation 없는 Run 판단 저장.
- 일부 계측 결과가 없는 Run 판단 저장.
- 판단 변경 이력 유지.
- 기존 설정 기반 판단 선택지 유지.
- 권한 없는 판단 저장 차단.
- 기존 Decision/NextAction 조회 및 저장 호환성.

### Integration and Persistence

- 신규 Run 복사 및 Group 상속.
- 기존 Run과 신규 Run의 독립적 데이터 유지.
- 기존 Legacy Run 조회.
- 기존 Actual 및 Measurement 참조 보존.
- 계획 Skip에 대한 Actual 불일치 표시.
- 집중 공정 필터가 계획 및 실제 데이터에 영향 없음.
- 새로고침 후 저장 정보 복원.
- 서버 재시작 후 PostgreSQL 데이터 복원.
- Specimen 실험 회귀 검증.
- Writer/Viewer/Denied 권한 검증.
- 1,000개 이상 Operation × 25 Wafer 성능 측정.
- 기존 전체 관련 회귀 테스트.

기존 테스트 PASS 결과만으로 신규 구현 성공을 주장하지 않는다.

모든 테스트는 실행한 것과 실행하지 않은 것을 구분한다.

---

## 8. Quality Gate — Definition of Done

각 Work Package는 다음 기준을 충족해야 완료로 판단한다.

1. 승인 업무 요구사항 충족.
2. 기존 도메인 모델과 정합성 확보.
3. PostgreSQL 실제 저장 및 조회 검증.
4. 서버 측 권한 검증.
5. 정상 및 예외 시나리오 검증.
6. Unit 및 Integration Test.
7. Browser E2E Test.
8. 관련 기존 기능 회귀 테스트.
9. 실제 화면 및 사용자 동선 검증.
10. Requirement Traceability 및 Decision Log 업데이트.

가능한 경우 다음 증적을 제공한다.

- TypeScript 검증.
- Lint.
- Production Build.
- 실제 PostgreSQL Contract Test.
- Browser Screenshot.
- 실행 환경 및 재현 방법.
- Branch/HEAD/Commit.
- 테스트 로그.
- 실제 UAT Route.

UI가 표시된다는 이유만으로 기능 완료로 판단하지 않는다.

Fixture 또는 localStorage 동작만으로 PostgreSQL 기반 제품 구현 완료를 주장하지 않는다.

CI가 없다면 미구성으로 명시한다.

기존 Activation 간헐적 오류의 미확정 상태를 보존한다.

---

## 9. Five-Perspective Self Review

Codex는 각 Work Package 완료 전에 다음 관점의 자체 검토를 수행한다.

### PI Consultant

- 실제 연구자의 업무 목적과 일치하는가?
- 불필요한 업무 제약을 만들지 않았는가?
- 명시적인 실험 의도를 보존하는가?

### Solution Architect

- 기존 도메인 구조를 최대한 재사용했는가?
- 조건값의 권위 있는 저장 원천이 하나인가?
- 과거 데이터의 참조와 의미가 유지되는가?

### Screen Designer

- 정보 구조가 명확한가?
- 기존 제품 디자인과 일관성이 있는가?
- Grid와 Inspector의 역할이 적절한가?

### UI/UX Specialist

- 반복 입력과 불필요한 클릭을 최소화했는가?
- 상속, 예외, Skip, 미할당이 명확한가?
- 실제 연구자의 업무 동선이 자연스러운가?

### Senior Developer

- 실제 저장 및 조회가 검증됐는가?
- 권한 및 동시성이 안전한가?
- 회귀 테스트 및 변경 증적이 있는가?

검토 의견만 작성하지 말고 발견된 문제를 승인 범위 내에서 수정한 후 결과를 제출한다.

---

## 10. Progress Reporting

기존 제품 개발 진척률과 이번 Enhancement 개발 진척률을 분리한다.

기존 제품의 누적 개발 이력을 초기화하지 않는다.

전체 제품 진척률은 기능 Baseline 및 실제 구현·검증 근거를 확인할 수 있을 때만 산정한다.

다음 형식으로 보고한다.

### Existing Product

- 기존 통합 Baseline.
- 누적 기능 구현 상태.
- 기존 검증 실적.
- 기존 미해결 Risk.
- Human UAT 상태.

### Enhancement

| Work Package | 구현 상태 | 테스트 상태 | 화면 확인 | Commit | Blocker |
|---|---|---|---|---|---|

### Test Evidence

- 신규 테스트 PASS/FAIL/NOT RUN 수.
- 기존 회귀 테스트 PASS/FAIL/NOT RUN 수.
- PostgreSQL 검증 결과.
- Browser 검증 결과.
- 실제 실행한 Test Command.
- 현재 실행 가능한 UAT Route.

### Change Evidence

- 주요 변경 파일.
- Schema 및 Migration 변경.
- API 변경.
- 화면 캡처.
- Branch.
- HEAD.
- PR 정보.
- 기존 기능 영향 범위.

### Next Actions

- 완료된 작업.
- 잔여 구현.
- 잔여 검증.
- 실제 Blocker.
- Product Owner 결정이 필요한 항목.

분석 문서 작성이나 설계 완료를 제품 기능 구현 완료로 계산하지 않는다.

---

## 11. Scope Exclusions

이번 Enhancement에 다음 기능을 추가하지 않는다.

- 신규 AI 기능.
- 신규 MES Integration.
- 자동 DOE 설계.
- 별도 Batch 관리 시스템.
- 외부 Recipe Master 연동.
- 단일 Source Parameter의 복수 소재 혼합 관리.
- 전면적인 UI Framework 변경.
- 기존 Domain Architecture 재구축.
- 불필요한 범용 Workflow Engine.

향후 확장 가능성은 보존하되 현재 요구사항의 구현을 지연시키지 않는다.

---

## 12. Final Authorization

D01~D08 업무 정책은 확정되었다.

이 지시서를 수신한 후 추가적인 전체 AS-IS 분석과 승인 요청을 반복하지 않는다.

안전한 개발 환경을 확보하고 WP-00부터 실제 구현을 시작한다.

승인된 범위에서 독립적으로 수행 가능한 작업은 최대한 진행한다.

새로운 업무 정책이 필요하거나 기존 데이터 및 권한의 의미가 달라지는 경우에만 GPT/Product Owner 검토를 요청한다.

Work Package별 구현 및 검증을 수행하고 증적을 남긴다.

기존 PR #26, 기존 Human UAT 환경, 운영 데이터 및 권한을 보호한다.

별도 승인 없이 병합하거나 운영 배포하지 않는다.

**The objective is not more code or more documentation. The objective is a coherent, usable, traceable, and production-quality LIMS product.**

Proceed with implementation.