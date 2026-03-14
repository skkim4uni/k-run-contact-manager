# CLAUDE.md — K-run Contact Manager 개발 컨텍스트

---

## 1. 프로젝트 개요

- **앱 이름**: K-run Contact Manager
- **목적**: VC 업무용 연락처 및 미팅 로그 통합 관리
- **기술 스택**
  - Frontend: Next.js (App Router)
  - UI: shadcn/ui + Tailwind CSS
  - Database: Supabase (PostgreSQL)
  - Deployment: Vercel
  - Version Control: GitHub

- **개발 원칙**
  - 컴포넌트는 단순하고 직관적으로 유지
  - Supabase 클라이언트는 단일 인스턴스로 관리
  - 모든 DB 통신은 서버 컴포넌트 또는 API Route에서 처리
  - TypeScript 사용
  - 한국어 UI

- **폴더 구조**
  ```
  /
  ├── app/
  │   ├── page.tsx                  # 대시보드
  │   ├── contacts/
  │   │   └── page.tsx              # 연락처 관리
  │   ├── logs/
  │   │   └── page.tsx              # 미팅 로그 전체 목록
  │   └── layout.tsx
  ├── components/
  │   ├── ui/                       # shadcn/ui 컴포넌트
  │   ├── contacts/                 # 연락처 관련 컴포넌트
  │   ├── dashboard/                # 대시보드 및 공유 컴포넌트
  │   │   └── MeetingLogPanel.tsx   # 공유 미팅 로그 팝업
  │   ├── logs/                     # 미팅 로그 전체 목록 컴포넌트
  │   │   └── LogsPage.tsx
  │   └── mobile/                   # 모바일 전용 컴포넌트
  │       ├── MobileNav.tsx
  │       ├── MobileDashboard.tsx
  │       ├── MobileContacts.tsx
  │       └── MobileLogs.tsx
  ├── lib/
  │   ├── supabase.ts               # Supabase 클라이언트
  │   ├── types.ts                  # TypeScript 타입 정의
  │   └── utils.ts                  # 공통 유틸 함수
  └── hooks/
      ├── useContacts.ts            # 연락처 데이터 훅
      └── useMeetingLogs.ts         # 미팅 로그 데이터 훅
  ```

---

## 2. DB 구조

### contacts 테이블
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | UUID | PK, 자동 생성 |
| name | TEXT | 이름 (필수) |
| company | TEXT | 회사 |
| department | TEXT | 부서 |
| position | TEXT | 직급 |
| email | TEXT | 이메일 |
| phone | TEXT | 전화번호 |
| group_tag | TEXT | 그룹 (투자업계/LP/개인/기타) |
| importance | TEXT | 중요도 (상/중/하) |
| interest | BOOLEAN | 관심 여부 |
| excluded | BOOLEAN | 대상 제외 여부 |
| contact_cycle | INTEGER | 연락 주기 (일 단위) |
| last_contact_date | DATE | 최근 컨택일 |
| memo | TEXT | 메모 |
| created_at | DATE | 최초 등록일 (노션 원본 날짜) |
| inserted_at | TIMESTAMPTZ | DB 입력일 |
| updated_at | TIMESTAMPTZ | 수정일 |

### meeting_logs 테이블
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | UUID | PK, 자동 생성 |
| contact_id | UUID | FK → contacts.id (CASCADE) |
| meeting_date | DATE | 미팅 날짜 (필수) |
| contents | TEXT | 미팅 내용 |
| created_at | TIMESTAMPTZ | 생성일 |
| updated_at | TIMESTAMPTZ | 수정일 |

---

## 3. 화면 구조

### 3-1. 대시보드 (`/`)

#### 요약 카드 (상단)
- 연락 필요 대상자 전체 수
- 연락 필요 대상자 그룹별 카운트 (투자업계 / LP / 개인 / 기타)
- 연락 필요 대상자 중 관심 연락처 수
- (연락 필요 대상자 기준: last_contact_date + contact_cycle < 오늘 날짜)

#### 연락 필요 대상자 목록 (메인)
- contact_cycle 기준으로 연락 기한이 지난 사람만 표시
- 검색 (이름, 회사명)
- 필터 (그룹별 / 중요도별 / 대상제외 / 관심여부)
- 정렬 관리 패널 버튼 (정렬 기준 추가/삭제/순서 변경, 각 기준별 오름차순/내림차순, 다중 정렬 지원)
- 컬럼 관리 드롭다운 버튼 (이름 고정, 나머지 13개 컬럼 체크박스로 on/off)
- 페이지당 목록 수 선택 (10개 / 20개 / 50개 / 100개)
- 페이지네이션

#### 미팅 로그 팝업 (이름 클릭 시)
- 팝업 상단: 연락처 기본 정보 요약 (이름 / 회사 / 직급 / 그룹 / 중요도 / 최근컨택일)
- 팝업 하단: 해당 연락처의 미팅 로그 목록 (날짜 / 내용)
- 새 미팅 로그 추가 버튼

#### 미팅 로그 입력/수정 화면 (로그 클릭 또는 추가 버튼 클릭 시)
- 미팅 날짜: 캘린더 선택, 기본값 오늘 날짜
- 내용: 텍스트 입력창
- 저장 / 취소 / 삭제 버튼
- 저장/취소/삭제 후 로그 목록으로 돌아옴

### 3-2. 연락처 관리 (`/contacts`)

#### 목록 화면
- 전체 연락처 테이블 표시
- 검색 (이름, 회사명)
- 필터 (그룹별 / 중요도별 / 대상제외 / 관심여부)
- 정렬 관리 패널 버튼 (정렬 기준 추가/삭제/순서 변경, 각 기준별 오름차순/내림차순, 다중 정렬 지원)
- 컬럼 관리 드롭다운 버튼 (이름 고정, 나머지 13개 컬럼 체크박스로 on/off)
- 페이지당 목록 수 선택 (10개 / 20개 / 50개 / 100개)
- 페이지네이션
- CSV 업로드 버튼 (중복 제외, 새 데이터만 추가)
- 새 연락처 추가 버튼
- 행 체크박스 선택 후 일괄 삭제 버튼 (삭제 확인 팝업 포함)

#### 숨김 가능한 컬럼 13개
회사 / 부서 / 직급 / 이메일 / 전화번호 / 그룹 / 중요도 / 관심여부 / 대상제외 / 연락주기 / 최근컨택일 / 메모 / 등록일

#### 연락처 추가/수정 (모달 팝업)
- 새 연락처 추가 버튼 클릭 또는 연락처 행 클릭 시 모달 오픈
- 전체 17개 필드 편집 가능
- 저장 / 취소 버튼

#### 연락처 삭제
- 단건: 모달 내 삭제 버튼 (삭제 확인 팝업)
- 다건: 목록에서 체크박스로 여러 행 선택 후 일괄 삭제 (삭제 확인 팝업)

### 3-3. 미팅 로그 전체 목록 (`/logs`)

#### 목록 화면
- meeting_logs 전체를 컨택일(meeting_date) 최신순으로 표시
- 표시 컬럼: 컨택일 / 이름 / 회사 / 내용 (truncate)
- 키워드 검색: 이름 또는 내용(contents)
- 페이지당 목록 수 선택 (10개 / 20개 / 50개 / 100개)
- 페이지네이션 (처음 / 이전 / 다음 / 끝)
- 행 클릭 시 해당 연락처의 미팅 로그 팝업 오픈 (기존 MeetingLogPanel 재사용)

#### 데이터 레이어
- `getAllMeetingLogs()` — meeting_logs + contacts 조인, meeting_date DESC 정렬
- `MeetingLogWithContact` 타입 (lib/types.ts) — MeetingLog + contacts: Contact

#### 모바일 버전 (MobileLogs)
- 카드 형태 목록 (이름 / 회사 / 내용 / 컨택일)
- 동일 검색 + 페이지 크기 + 페이지네이션
- 카드 탭 시 미팅 로그 팝업

---

## 4. 코딩 규칙

- 컴포넌트 파일명: PascalCase (예: ContactCard.tsx)
- 훅 파일명: camelCase (예: useContacts.ts)
- Supabase 클라이언트는 `lib/supabase.ts` 에서만 import
- 환경변수는 `.env.local` 에서 관리
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- 에러 처리는 모든 DB 호출에 try/catch 적용
- 날짜 포맷: YYYY-MM-DD 기준

---

## 5. 개발 단계 (5단계 프롬프트)

### STEP 1 — 프로젝트 초기 세팅 ✅ 완료
### STEP 2 — DB 연동 및 데이터 레이어 ✅ 완료
### STEP 3 — 연락처 관리 화면 ✅ 완료

### STEP 4 — 대시보드 화면
```
CLAUDE.md를 참고하여 STEP 4 작업을 시작합니다.

app/page.tsx에 대시보드 화면을 구현하세요.
세부 기능은 CLAUDE.md 섹션 3-1을 참고하세요.

구현 순서:
1. 연락 필요 대상자 계산 로직 구현
   (last_contact_date + contact_cycle < 오늘 날짜인 연락처)
2. 요약 카드 구현
   - 연락 필요 대상자 전체 수
   - 그룹별 카운트 (투자업계 / LP / 개인 / 기타)
   - 관심 연락처 수
3. 연락 필요 대상자 목록 구현
4. 검색 기능 구현 (이름, 회사명)
5. 필터 기능 구현 (그룹별 / 중요도별 / 대상제외 / 관심여부)
6. 정렬 관리 패널 구현 (다중 정렬, 오름차순/내림차순)
7. 컬럼 관리 드롭다운 구현 (이름 고정, 13개 컬럼 on/off)
8. 페이지당 목록 수 선택 및 페이지네이션 구현
9. 이름 클릭 시 미팅 로그 팝업 구현
   - 팝업 상단: 연락처 기본 정보 요약
   - 팝업 하단: 미팅 로그 목록
   - 새 미팅 로그 추가 버튼
10. 미팅 로그 입력/수정 화면 구현
    - 미팅 날짜: 캘린더 선택, 기본값 오늘 날짜
    - 내용: 텍스트 입력창
    - 저장 / 취소 / 삭제 버튼
    - 저장/취소/삭제 후 로그 목록으로 돌아옴
```

### STEP 5 — 네비게이션 및 마무리
```
CLAUDE.md를 참고하여 STEP 5 작업을 시작합니다.

1. 대시보드(/)와 연락처 관리(/contacts) 간 네비게이션 메뉴 구현
2. 전체 레이아웃 통일 및 UI 정리
3. Vercel 최종 배포 확인
```

---

## 6. 모바일 버전

### 개발 방식
- 모바일 전용 UI 별도 제작 (방향 B)
- PC와 동일한 URL, 화면 크기에 따라 모바일 컴포넌트 렌더링
- Tailwind 반응형 breakpoint 기준: md 이하는 모바일 UI 적용
- 하단 탭 네비게이션 (대시보드 / 연락처 / 미팅 로그)

### 모바일 제외 기능 (PC 전용)
- 컬럼 관리, CSV 업로드, 일괄 삭제, 다중 정렬 패널

### 6-1. 모바일 대시보드
- 연락 필요 대상자 요약 카드 (전체 수 / 그룹별 카운트 / 관심 수)
- 연락 필요 대상자 목록 (카드 형태)
  - 표시 필드: 이름 / 회사 / 중요도
  - 검색 (이름, 회사명)
  - 필터 드롭다운 (그룹별 / 중요도별 / 관심여부 / 대상제외)
  - 정렬 드롭다운 (항목 선택 + 오름차순/내림차순)
- 카드 탭 시 미팅 로그 팝업

### 6-2. 모바일 미팅 로그 팝업
- 상단: 이름 / 회사 / 중요도 / 최근컨택일
- 하단: 미팅 로그 목록 (날짜 / 내용)
- 새 미팅 로그 추가 버튼
- 로그 탭 시 수정 화면으로 전환
  - 미팅 날짜: 캘린더 선택, 기본값 오늘 날짜
  - 내용: 텍스트 입력창
  - 저장 / 취소 / 삭제 버튼

### 6-3. 모바일 연락처 조회
- 검색 및 필터 드롭다운
- 이름 / 회사 / 중요도 카드 형태 목록
- 카드 탭 시 미팅 로그 팝업

### 6-4. 모바일 미팅 로그 전체 목록
- 키워드 검색 (이름, 내용)
- 페이지 크기 선택 + 페이지네이션
- 카드 형태 목록 (이름 / 회사 / 내용 / 컨택일)
- 카드 탭 시 미팅 로그 팝업
