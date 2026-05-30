# 자기결정성(SDC) 지표 & 별/별자리/메달/리셋 로직 분석

> 분석 대상: `index.html` (실버스타노트)  
> 작성일: 2026-05-30

---

## 1. 자기결정성(SDC) 지표 항목 목록

총 3개 체크박스. 회원(Member) 폼과 게스트(Guest) 폼 모두 동일한 구조로 존재.

| ID | 항목명 | 질문 |
|---|---|---|
| `sdc-autonomy` | ① 미세자율성 | 교재 색상, 도구 종류, 오늘의 목표치를 어르신이 스스로 결정하셨나요? |
| `sdc-persistence` | ② 지속 의지 | 문제가 어려워 고비가 왔음에도 포기하지 않고 끝까지 완수하셨나요? |
| `sdc-relation` | ③ 관계성 | 동료에게 도구를 양보하거나 밝은 미소로 감정적 유대감을 나누셨나요? |

- `sdc-relation` 체크 시 → 키워드 텍스트 입력창(`sdc-relation-input`) 추가 노출
- 각 항목 체크 시 칭찬 토스트 + 별 날아오르는 애니메이션 즉시 발생

**관찰 기록 문장에 자동 추가되는 구절**

| 항목 | 생성 문장 |
|---|---|
| autonomy | "활동의 일부를 스스로 결정하시며 자기결정성을 발휘하셨습니다." |
| persistence | "어려운 순간에도 포기하지 않고 도움을 요청하며 끝까지 완수하셨습니다." |
| relation | "동료와 따뜻한 유대감을 나누시며 {키워드}의 모습을 보여주셨습니다." |

---

## 2. 별 부여 기준

### 2.1 세션별 별 계산 — `calcSessionStars()` (line 1849)

```
기본 1개 (참여 자체)
+ autonomy 체크:    +1개
+ persistence 체크: +2개  ← 가중치 높음
+ relation 체크:    +1개
───────────────────────
최대                  5개
```

| SDC 체크 조합 | 획득 별 수 |
|---|---|
| 아무것도 미체크 | ★ 1개 |
| autonomy만 | ★★ 2개 |
| relation만 | ★★ 2개 |
| persistence만 | ★★★ 3개 |
| autonomy + relation | ★★★ 3개 |
| autonomy + persistence | ★★★★ 4개 |
| persistence + relation | ★★★★ 4개 |
| 전부 체크 | ★★★★★ 5개 (최대) |

### 2.2 점수(Score) 계산 — `updateScore()` (line 1807)

별과 별개로 `records.score` 컬럼에도 영향을 줌.

```
최종 점수 = min(100, 도움수준 기본점수 + SDC 보너스)
```

| 도움 수준 | 기본 점수 |
|---|---|
| 신체적 보조 (physical) | 40 |
| 시각적 시범 (visual) | 60 |
| 구두 힌트 (verbal) | 80 (기본값) |
| 독립적 수행 (independent) | 100 |

SDC 항목당 +5점 (최대 +15), 상한 100점.

---

## 3. 별자리 계산 방식

### 3.1 공식 — `awardStars()` (line 1965)

```
누적 별자리 수 = floor(누적 별 수 / 5)
```

별 5개가 모일 때마다 별자리 1개 완성.

### 3.2 별자리 완성 조건

- `newConst > prevConst` 가 될 때 이벤트 발생
- 불꽃놀이 애니메이션(`spawnFireworks`) + 팝업(`showAchievement`) 표시
- 팝업 메시지: "별 5개를 모아 N번째 별자리가 완성되었어요!"

### 3.3 시즌 내 별자리 진행 표시 — `renderTrack2()` (line 2012)

```
starsInProgress = 시즌 누적 별 수 % 5      // 현재 별자리 내 진행 별 수 (0~4)
starsToNext     = 5 - starsInProgress        // 다음 별자리까지 필요 별 수
barPct          = starsInProgress / 5 * 100  // 진행 바 %
seasonConst     = floor(시즌 누적 별 수 / 5) // 이번 시즌 완성 별자리 수
```

---

## 4. 메달 부여 기준

### 4.1 메달 등급 — `getMedal(n)` (line 1831)

`n` = 누적 별자리 개수

| 별자리 수 | 메달 | 이름 |
|---|---|---|
| 200개 이상 | 👑 | 왕관 |
| 100개 이상 | 🥇 | 금메달 |
| 50개 이상 | 🥈 | 은메달 |
| 20개 이상 | 🥉 | 동메달 |
| 20개 미만 | (없음) | — |

### 4.2 다음 메달 힌트 — `nextMedalHint(n)` (line 1841)

| 현재 상태 | 메시지 |
|---|---|
| 200개 이상 | "👑 최고 등급 달성!" |
| 100~199개 | "👑 왕관까지 N개 남음" |
| 50~99개 | "🥇 금메달까지 N개 남음" |
| 20~49개 | "🥈 은메달까지 N개 남음" |
| 20개 미만 | "🥉 동메달까지 N개 남음" |

### 4.3 메달 승급 이벤트

`newMedal !== prevMedal` 조건 충족 시:
- 불꽃놀이(`spawnFireworks`) + 팝업(`showAchievement`) 표시
- 팝업 버튼: "감사합니다!" / "🖨 상장 출력"
- `printCertificate()` — 새 창에 수료증 HTML 생성 후 자동 인쇄

---

## 5. 리셋 주기 및 조건

### 5.1 명시적 리셋 없음

`total_stars`, `total_constellations`, `current_medal`은 **누적 증가만** 되며, 코드 내에 초기화 버튼/함수가 존재하지 않음.

### 5.2 시즌 전환 (3개월 슬라이딩 윈도우) — `renderTrack2()` (line 2019)

```
seasonNum = floor(경과 개월 수 / 3) + 1
```

- `season_start_date`가 최초 기록 저장 시 자동 설정되며 이후 **변경 없음**
- 3개월마다 시즌 번호 자동 증가 (초기화가 아닌 슬라이딩 방식)
- 이전 시즌 기록은 `buildSeasonHistory()`로 조회 가능
- `total_stars`에는 전 시즌 별도 계속 누적 (시즌 리셋 아님)

### 5.3 어르신 퇴소/복귀 — `toggleSeniorActive()` (line 1727)

- `seniors.is_active` 필드만 토글
- 별/별자리/메달 데이터는 **보존됨** (삭제/초기화 없음)

### 5.4 로그아웃 시 초기화 — `doLogout()` (line 1242)

별 시스템과 무관한 달력 상태 변수만 메모리에서 초기화:
- `_calPlan`, `_calSchedulesLoaded`, `_calMatsLoaded`, `_calMats`, `_calCenterId`

---

## 6. 관련 Supabase 테이블/컬럼

### 6.1 `records` 테이블 (관찰 기록)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `record_id` | string | PK (예: `REC-XXXXXXXX`) |
| `senior_id` | string | 어르신 FK |
| `senior_name` | string | 어르신 이름 |
| `user_id` | string | 작성 직원 FK |
| `user_name` | string | 작성자 이름 |
| `center_id` | string | 센터 FK |
| `domain` | string | 인지 영역 (예: "주의집중력 (Attention)") |
| `task_type` | string | 문제 유형 |
| `topic` | string | 활동 주제 |
| `level` | string | 도움 수준 (physical/visual/verbal/independent) |
| `score` | number | 도움수준 기본점수 + SDC 보너스 (최대 100) |
| `stars` | number | 세션에서 획득한 별 개수 (1~5) |
| `tags` | string | 특이사항 및 반응 |
| `text` | string | 생성된 관찰 기록 문장 |
| `created_at` | ISO string | 생성 시각 (UTC) |

### 6.2 `seniors` 테이블 (어르신 정보)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `senior_id` | string | PK (예: `SNR-XXXXXXXX`) |
| `center_id` | string | 소속 센터 FK |
| `name` | string | 어르신 이름 |
| `birth_year` | number | 출생연도 |
| `gender` | string | 성별 (m/f) |
| `grade` | string | 요양등급 |
| `notes` | string | 특이사항 |
| `is_active` | boolean | 재원 여부 |
| `total_stars` | number | 누적 별 개수 |
| `total_constellations` | number | 누적 별자리 개수 |
| `current_medal` | string | 현재 메달 이모지 (👑/🥇/🥈/🥉) |
| `season_start_date` | string | 시즌 시작일 (최초 기록 저장 시 자동 설정, YYYY-MM-DD) |
| `created_at` | ISO string | 등록 시각 |

### 6.3 `users` 테이블 (직원 계정)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `user_id` | string | PK |
| `center_id` | string | 소속 센터 FK |
| `name` | string | 직원 이름 |
| `email` | string | 이메일 |
| `pw_hash` | string | 비밀번호 해시 (djb2) |
| `role` | string | admin / member |
| `is_active` | boolean | 활성 여부 |
| `email_verified` | boolean | 이메일 인증 여부 |
| `created_at` | ISO string | 생성 시각 |

### 6.4 `centers` 테이블 (센터 정보)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `center_id` | string | PK |
| `name` | string | 센터명 |
| `business_no` | string | 사업자번호 |
| `representative` | string | 대표자명 |
| `subscription` | string | 구독 상태 (active 등) |
| `invite_code` | string | 직원 초대 코드 |
| `created_at` | ISO string | 생성 시각 |
