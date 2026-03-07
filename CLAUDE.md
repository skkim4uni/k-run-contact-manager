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
  │   │   ├── page.tsx              # 연락처 목록
  │   │   └── [id]/
  │   │       └── page.tsx          # 연락처 상세 + 미팅 로그
  │   └── layout.tsx
  ├── components/
  │   ├── ui/                       # shadcn/ui 컴포넌트
  │   ├── contacts/                 # 연락처 관련 컴포넌트
  │   └── meeting-logs/             # 미팅 로그 관련 컴포넌트
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
- 세부 기능 추후 확정 예정

### 3-2. 연락처 관리 (`/contacts`)

#### 목록 화면
- 전체 연락처 테이블 표시
- 검색 (이름, 회사명)
- 필터 (그룹별 / 중요도별 / 대상제외 / 관심여부)
- 정렬 관리 패널 버튼 (정렬 기준 추가/삭제/순서 변경, 각 기준별 오름차순/내림차순 선택, 다중 정렬 지원)
- 컬럼 관리 드롭다운 버튼 (이름 컬럼 고정, 나머지 13개 컬럼 체크박스로 on/off)
- 페이지당 목록 수 선택 (10개 / 20개 / 50개 / 100개)
- 페이지네이션 (이전/다음/페이지 번호)
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

### 3-3. 연락처 상세 + 미팅 로그 (`/contacts/[id]`)
- 세부 기능 추후 확정 예정

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

### STEP 3 — 연락처 관리 화면
```
CLAUDE.md를 참고하여 STEP 3 작업을 시작합니다.

app/contacts/page.tsx에 연락처 관리 화면을 구현하세요.
세부 기능은 CLAUDE.md 섹션 3-2를 참고하세요.

구현 순서:
1. 연락처 테이블 기본 목록 구현
2. 검색 기능 구현 (이름, 회사명)
3. 필터 기능 구현 (그룹별 / 중요도별 / 대상제외 / 관심여부)
4. 정렬 관리 패널 구현 (다중 정렬, 오름차순/내림차순)
5. 컬럼 관리 드롭다운 구현 (이름 고정, 13개 컬럼 on/off)
6. 페이지당 목록 수 선택 및 페이지네이션 구현
7. CSV 업로드 기능 구현 (중복 제외, 새 데이터만 추가)
8. 새 연락처 추가 / 수정 모달 팝업 구현 (전체 17개 필드)
9. 단건 삭제 (모달 내 삭제 버튼 + 확인 팝업)
10. 다건 삭제 (체크박스 선택 + 일괄 삭제 버튼 + 확인 팝업)
```

### STEP 4 — 대시보드 화면
```
CLAUDE.md를 참고하여 STEP 4 작업을 시작합니다.
app/page.tsx에 대시보드 화면을 구현하세요.
세부 기능은 CLAUDE.md 섹션 3-1을 참고하세요.
(※ 개발 전 세부 기능 확정 후 이 항목을 업데이트할 것)
```

### STEP 5 — 미팅 로그 화면
```
CLAUDE.md를 참고하여 STEP 5 작업을 시작합니다.
app/contacts/[id]/page.tsx에 미팅 로그 화면을 구현하세요.
세부 기능은 CLAUDE.md 섹션 3-3을 참고하세요.
(※ 개발 전 세부 기능 확정 후 이 항목을 업데이트할 것)
```
