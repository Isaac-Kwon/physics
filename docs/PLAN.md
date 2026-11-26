# 프로젝트 마스터 플랜 — Physics, from the Outside In

- Repository: https://github.com/isaac-kwon/physics
- 배포 예정 주소: `https://isaac-kwon.github.io/physics/` (GitHub Pages, base path `/physics`)
- 언어: 한국어(ko) · English(en) · Italiano(it)
- 문서 상태: v0.3 (2026-11-26) — 기획 단계. 코드 없음.
  - v0.2: 깊이 상한을 물리학과 학부생으로 조정. 실제 측정 데이터 대신 대표 수치 · 개략 그래프 사용.
  - v0.3: 연구 주제마다 독립된 토픽 페이지로 재구성. 허브(토픽 지도) + 연계 장치(Primer, Bridge, 공유 장면, Related Topics) 도입.
    층 수를 토픽별로 자유롭게 (층 id + 공통 깊이 등급 T0–T4). 실험은 원리 기반 그림(Detection Walkthrough)으로.
    Heavy-Ion 에 Beam Energy Scan 층 추가, ALICE · STAR · CBM 을 함께 다룸.

---

## 1. 목표와 원칙

### 1.1 목표
여러 물리학 분야(중이온 물리, 암흑물질, 중성미자, 반도체 검출기, 검출기 일반 원리)를
각각 **독립된 토픽 페이지** 에서 **스크롤 기반의 시각적 이야기(scrollytelling)** 로 소개하고,
토픽 사이의 연결을 함께 보여주는 다국어 정적 웹사이트.

### 1.2 대상 독자 (이중 독자)
| 독자 | 원하는 것 | 우리가 주는 것 |
|---|---|---|
| 일반인 (물리 지식 없음) | "왜 이게 멋진가" | 큰 숫자, 비유, 아름다운 비주얼, 짧은 문장 |
| 교양 독자 / 학생 | "어떻게 작동하는가" | 단순화된 메커니즘 다이어그램, 조작 가능한 위젯 |
| 물리학과 학부생 | "원리를 제대로, 그리고 지금 무엇을 연구하는가" | 학부 교재 수준의 수식, 개략적인 그래프, 실험 장치의 구조, 연구 주제의 개념적 소개 |

→ 한 페이지 안에서 **위로 갈수록 쉽고, 아래로 갈수록 깊어진다.** 일반인은 중간에서 멈춰도
완결된 경험을 얻고, 학부생은 끝까지 내려가며 보상을 받는다.

**깊이의 상한 = 물리학과 학부생.** 연구자를 위한 정밀한 수치, 실제 측정 데이터, 최신 논문 수준의
논의는 다루지 않는다. 가장 깊은 층도 "학부 고학년이 세미나에서 듣고 이해할 수 있는 수준" 을 넘지 않는다.

### 1.3 디자인 원칙
1. **Outside → Inside**: 모든 토픽 페이지는 가장 바깥(현상, 스케일 큰 것)에서 시작해 안쪽(메커니즘, 미시 세계)으로 들어간다.
2. **Scroll = Depth**: 스크롤은 "다음 페이지"가 아니라 "더 깊이"를 의미한다. 화면 옆 *Depth Gauge* 가 현재 깊이/스케일을 표시한다.
3. **Science first, spectacle second**: 화려하되, 모든 비주얼은 물리적으로 의미가 있어야 한다. 장식용 파티클 금지 — 파티클이 움직이면 그것은 실제 물리량(운동량, 에너지, 시간)을 표현해야 한다.
4. **One idea per screen**: Apple 마케팅 페이지처럼 한 화면 = 한 메시지. 큰 헤드라인 + 한 개의 숫자 또는 한 개의 이미지.
5. **숫자는 감각을 위해 쓴다**: 정확한 측정값이 아니라 **자릿수(order of magnitude) 와 대표값** 을 쓴다
   ("약 10¹² K", "수천 개의 궤적"). 그래프는 실제 데이터가 아닌 **정성적 개략도** 로 그리고, 그렇다고 표시한다.
   수치가 틀리지 않도록 페이지 끝 참고문헌으로 뒷받침하되, 수치마다 출처를 달지는 않는다.
6. **실험은 "어떻게 잡는가" 를 그림으로**: 실제 실험을 다룰 때는 이름·제원·조직 소개가 아니라,
   **입자가 들어와서 신호가 되기까지를 원리 기반의 그림으로 단계별로** 보여준다.
   자세하되 지나치지 않게 — 3–5 단계, 핵심 트릭 하나 (§3.5).

---

## 2. 사이트 전체 구조 (Information Architecture)

### 2.1 구성 원칙: 독립된 토픽 페이지 + 허브
사이트는 하나의 긴 이야기가 아니라 **거대 연구 주제마다 독립된 페이지**(토픽 페이지)로 구성하고,
이들을 **허브(랜딩)** 가 묶는다. 각 토픽 페이지는 사실상 하나의 작은 마이크로사이트다.

```
                         ┌──────────── 허브 (토픽 지도) ────────────┐
                         │                                         │
   Dark Matter   Neutrinos   Detectors   Semiconductor Detectors   Heavy-Ion
        │            │           │                │                    │
        └──── Bridge · Primer · 공유 장면 · Related Topics (§2.5) ────┘
```

**독립성 규칙**
1. **자기 완결**: 어떤 토픽 페이지로 처음 들어온 사람도, 다른 페이지를 읽지 않고 모든 층을 끝까지 이해할 수 있어야 한다.
   필요한 배경 지식(예: 체렌코프 복사, TPC)은 페이지 안에 **Primer 블록**(§2.5)으로 포함한다.
2. **순서 없음**: 번호, 선수 과목, "이전/다음 챕터" 를 두지 않는다. 검색이나 공유 링크로 어느 페이지에 들어와도 된다.
3. **고유한 정체성**: 페이지마다 고유한 액센트 색, 히어로 장면, 제목·부제, OG 이미지.
   독립 출시와 독립 공유가 가능한 단위다.
4. **공통 틀**: 깊이 등급 체계(T0–T4, §2.4), 디자인 시스템, 내비게이션, 컴포넌트는 모두 공유한다. 페이지는 독립적이되 같은 사이트로 느껴져야 한다.

**연계성 규칙**
- 링크는 **보충이지 선수 조건이 아니다.** 연결을 따라가지 않아도 페이지는 완결된다.
- 연결은 본문 흐름을 끊지 않는 자리에 둔다 (여백의 Bridge 카드, 페이지 말미의 Related Topics).
- 같은 물리는 어느 페이지에서든 **같은 말과 같은 그림** 으로 설명한다 (Primer, 공유 장면).

### 2.2 허브 (랜딩)
- 짧은 히어로 하나 + **토픽 지도**.
- 토픽 지도: 토픽 카드를 **길이 스케일 축** 위에 배치한다 ("바깥 → 안쪽" 모티프를 사이트 수준에서 유지).
  카드 사이의 선이 연결 관계를 보여주고, 선에 마우스를 올리면 연결 이유가 한 줄로 나온다.
  ```
  10²⁶ m  Dark Matter ─────┐
  10¹¹ m  Neutrinos ───────┼──── Detectors (스케일 축 밖, "도구" 로 배치)
  10⁻⁵ m  Semiconductor ───┤
  10⁻¹⁵ m Heavy-Ion ───────┘
  ```
- 카드: 제목, 한 줄 요약, 히어로 장면의 짧은 루프 썸네일, 예상 읽기 시간, 출시 여부("곧 공개").
- 출시된 토픽만 활성화되므로 **허브는 첫 토픽 페이지와 함께 바로 공개할 수 있다.**
- 우주에서 쿼크까지 이어지는 긴 줌 연출은 1차 범위에서 제외하고 선택적 확장으로 남긴다 (§8 D5).

### 2.3 페이지 목록
| 경로 (`/{lang}/...`) | 내용 | 스토리보드 |
|---|---|---|
| `/` | 언어 감지 후 `/{lang}/` 로 안내 (정적이므로 클라이언트 측 감지 + 수동 선택) | — |
| `/{lang}/` | 허브: 토픽 지도 | [hub](storyboards/hub.md) |
| `/{lang}/heavy-ion/` | 중이온 물리의 기본 | [heavy-ion](storyboards/heavy-ion.md) |
| `/{lang}/dark-matter/` | 암흑물질과 그 검출 | [dark-matter](storyboards/dark-matter.md) |
| `/{lang}/neutrinos/` | 중성미자 검출기의 검출 방법 | [neutrinos](storyboards/neutrinos.md) |
| `/{lang}/semiconductor-detectors/` | 반도체 검출기의 원리와 연구 방법 | [semiconductor-detectors](storyboards/semiconductor-detectors.md) |
| `/{lang}/detectors/` | 검출기의 기본 원리 | [detectors](storyboards/detectors.md) |
| `/{lang}/glossary/` | 용어집 (3개 언어 대조) | — |
| `/{lang}/about/` | 제작자, 출처, 라이선스, 감사의 글 | — |

토픽 순서는 표시 순서일 뿐 읽는 순서가 아니다.

### 2.4 토픽 페이지 내부의 깊이 모델 — 층(Layer)과 깊이 등급(Tier)
"바깥에서 안쪽으로" 를 구체화하는 규칙. **층의 개수와 구성은 토픽마다 자유롭게** 정하고,
각 층에 **깊이 등급** 을 붙여 독자 수준과 글의 밀도를 맞춘다.

**층 (Layer)** — 토픽의 내용에 맞게 나눈 구간. 개수 제한 없음 (현재 스토리보드는 5–7개).
- 각 층은 고유한 **id** (영문 kebab-case, 예: `phase-diagram`) 와 제목을 가진다. id 는 URL 앵커(`/ko/heavy-ion/#phase-diagram`), 연결 지도, Depth Gauge 에 그대로 쓰인다.
- 한 층의 범위는 "한 가지 질문에 대한 답" (예: "충돌하면 무슨 일이?", "어떻게 검출하는가?").

**깊이 등급 (Tier)** — 모든 토픽에 공통인 독자 수준 척도.
| Tier | 독자 | 형식 | 문장 예산 |
|---|---|---|---|
| **T0** Hook | 모두 | 풀스크린 비주얼 + 큰 숫자 하나 + 한 줄 헤드라인 | 헤드라인 ≤ 12단어 |
| **T1** Intuition | 일반인 | 비유, 수식 없음, 핀 고정된 장면 + 스텝 텍스트 | 스텝당 ≤ 40단어 |
| **T2** Mechanism | 교양 | 단순화된 다이어그램, 조작 가능한 위젯 | 스텝당 ≤ 70단어 |
| **T3** Undergraduate | 학부 저학년 | 장치 구조, 신호가 생기는 과정, 개략 그래프, 기본 수식 | 스텝당 ≤ 100단어 |
| **T4** Frontier | 학부 고학년 | 지금 연구되는 질문과 연구 방법을 개념 수준으로, 더 읽을거리 | 스텝당 ≤ 120단어 |

**규칙**
1. 첫 층은 항상 T0 (Hook).
2. 층의 등급은 아래로 갈수록 **같거나 높아진다** (단조 증가). 같은 등급의 층이 여러 개 이어져도 된다 (예: Heavy-Ion 은 T3 층이 3개).
3. 등급을 두 단계 이상 건너뛰지 않는다 (갑작스러운 난이도 점프 방지).
4. 마지막 층도 T4 (학부 고학년) 를 넘지 않는다.
5. 모든 토픽이 T4 까지 가야 하는 것은 아니다. 내용상 T3 에서 끝나는 것이 자연스러우면 그렇게 한다.

**현재 구성 (스토리보드 기준)**
| 토픽 | 층 수 | 층 (등급) |
|---|---|---|
| Heavy-Ion | 7 | `hook`(T0) · `why`(T1) · `collision`(T2) · `fireball`(T3) · `phase-diagram`(T3) · `detection`(T3) · `frontier`(T4) |
| Dark Matter | 6 | `hook`(T0) · `evidence`(T1) · `candidates`(T2) · `search`(T2) · `direct-detection`(T3) · `frontier`(T4) |
| Neutrinos | 5 | `hook`(T0) · `ghost`(T1) · `sources`(T2) · `detection`(T3) · `frontier`(T4) |
| Semiconductor | 6 | `hook`(T0) · `intuition`(T1) · `mechanism`(T2) · `zoo`(T3) · `research`(T4) · `case-its3`(T4) |
| Detectors | 5 | `hook`(T0) · `history`(T1) · `interactions`(T2) · `measurement`(T3) · `design`(T4) |

추가 장치:
- **"Deeper" 접이식 박스**: 얕은 층(T1–T2)에도 학부생용 수식/주석을 접어서 넣는다 (기본 닫힘). 수식은 학부 교재(현대물리, 핵·입자물리 입문, 고체물리 입문)에 나오는 수준까지.
- **Depth Gauge**: 화면 우측의 세로 게이지. **그 페이지의 층 목록** (제목) 을 표시하고, 각 층의 등급을 색 농도로 나타낸다. 해당하는 경우 길이 스케일도 표시. 클릭으로 층 이동.

### 2.5 연계성 설계 (Connections)
페이지의 독립성을 해치지 않으면서 토픽들을 엮는 네 가지 장치.

| 장치 | 무엇 | 어디에 | 독립성과의 관계 |
|---|---|---|---|
| **Primer** | 여러 페이지에 필요한 기초 개념을 한 번만 쓴 짧은 블록 (≤ 150단어 + 작은 그림 1개). 각 Primer 에는 원본 토픽 페이지가 있다 | 필요한 페이지 본문 안에 삽입 (기본 접힘 또는 짧게 펼침) | 페이지에 필요한 배경을 **페이지 안에** 넣어 준다 → 자기 완결 보장 |
| **Bridge 카드** | "이 기술은 ○○ 페이지에서 더 깊이" + 썸네일 + 한 줄 이유 | 연결 지점의 여백(데스크톱) / 스텝 사이 작은 카드(모바일) | 흐름을 끊지 않는 선택적 이동 |
| **공유 장면 · 위젯** | 같은 물리는 같은 그림으로. 각 페이지의 액센트 색으로만 테마 변경 | 예: TPC 장면 (암흑물질·중성미자·중이온), Bethe–Bloch 위젯 (검출기·중이온 PID) | 일관성, 개발 비용 절감 |
| **Related Topics** | 연결 이유 한 줄이 붙은 토픽 카드 2–3개 | 페이지 맨 끝 | 다 읽은 뒤의 다음 행선지 |

여기에 **용어집 툴팁**이 공통으로 깔린다 (용어 → 정의 → 관련 토픽).

**Primer 목록 (초안)**
| id | 내용 | 원본 페이지 | 사용하는 페이지 |
|---|---|---|---|
| `ionization` | 하전 입자의 이온화, MIP | Detectors | Semiconductor, Heavy-Ion |
| `scintillation` | 섬광과 광센서 (PMT, SiPM) | Detectors | Dark Matter, Neutrinos |
| `cherenkov` | 체렌코프 복사 | Detectors | Neutrinos, Heavy-Ion (PID) |
| `tpc` | 시간 투영 상자 | Detectors | Dark Matter, Neutrinos, Heavy-Ion |
| `magnetic-tracking` | 자기장 속 궤적으로 운동량 재기 | Detectors | Heavy-Ion, Semiconductor |
| `particle-id` | 입자 식별 (dE/dx, 비행 시간) | Detectors | Heavy-Ion |
| `silicon-sensor` | 실리콘 센서가 입자를 전하로 바꾸는 법 | Semiconductor | Heavy-Ion, Dark Matter (CCD), Detectors |
| `underground-lab` | 왜 지하에서 실험하는가 | Dark Matter | Neutrinos |
| `weak-interaction` | 약한 상호작용과 중성미자 | Neutrinos | Dark Matter |
| `quarks-gluons` | 쿼크, 글루온, 강한 힘 | Heavy-Ion | Detectors |
| `standard-model` | 표준모형 한눈에 | (허브 / 용어집) | 전체 |

**연결 지도 (초안)**: 출발 페이지의 층 id 와 도착 페이지의 층 id 로 지정한다 (§2.4).
| from | to | 이유 |
|---|---|---|
| Dark Matter `#direct-detection` (CCD) | Semiconductor `#zoo` | 실리콘 CCD 로 전자 하나를 세는 암흑물질 실험 |
| Dark Matter `#direct-detection` (제논 TPC) | Detectors `#measurement` | TPC, 섬광, PMT |
| Dark Matter `#frontier` (neutrino fog) | Neutrinos `#detection` (CEvNS) | 중성미자가 암흑물질 탐색의 바닥이 된다 |
| Neutrinos `#detection` | Detectors `#interactions` | 체렌코프·섬광 신호의 생성 원리 |
| Neutrinos `#detection` (CEvNS) | Dark Matter `#frontier` | 반대 방향 연결 |
| Neutrinos `#frontier` (0νββ) | Semiconductor `#zoo` (HPGe) | 게르마늄 검출기 |
| Heavy-Ion `#detection` (ITS, CBM MVD/STS) | Semiconductor `#case-its3` | 실리콘 픽셀 트래커 |
| Heavy-Ion `#detection` (PID) | Detectors `#interactions` | dE/dx 입자 식별 (Bethe–Bloch) |
| Heavy-Ion `#why` (초기 우주) | Dark Matter `#evidence` | 우주론의 같은 이야기 |
| Semiconductor `#intuition` (MIP 전하) | Detectors `#interactions` | 신호의 출발점 |
| Semiconductor `#zoo` (HPGe, CCD) | Neutrinos `#frontier`, Dark Matter `#direct-detection` | 반대 방향 연결 |
| Semiconductor `#case-its3` | Heavy-Ion `#detection` | 이 센서들이 쓰이는 곳 |
| Detectors `#measurement` | Semiconductor `#mechanism`, Neutrinos `#detection`, Dark Matter `#direct-detection`, Heavy-Ion `#detection` | 각 검출 기술의 실제 사용처 |

각 스토리보드 끝의 "연계" 섹션이 이 표의 상세판이다. 구현 시 `connections.yaml` 로 옮긴다.

- 연결과 Primer 사용처는 **한 파일**(`src/content/connections.yaml`)에서 관리한다. 허브의 연결선, Bridge 카드, Related Topics 가 모두 여기서 생성되므로 양쪽 페이지가 어긋나지 않는다.
- 빌드 시 검사: 모든 연결의 앵커가 실제 존재하는지, 출시되지 않은 페이지로의 연결은 "곧 공개" 로 표시되는지.

---

## 3. 비주얼 · 인터랙션 언어

### 3.1 톤
- **기본 배경은 깊은 검정** (`#05060a` 근방). 검출기 이벤트 디스플레이(ALICE, CMS, IceCube)의 미학 —
  얇고 빛나는 궤적, 에너지에 비례하는 색, 정밀한 그리드.
- **과학 기기 UI의 디테일**: 단위가 붙은 모노스페이스 라벨, 축 눈금, 스케일 바, 좌표. "HUD" 느낌은 절제해서.
- **Apple 스타일 요소**: 거대한 타이포그래피, 넉넉한 여백, 스크롤에 맞춰 부드럽게 회전/분해되는 3D 오브젝트
  (예: 검출기가 양파 껍질처럼 한 겹씩 벗겨짐), 섹션 사이의 정지된 "숨 고르기".

### 3.2 색 체계
- 중립: 검정 배경, 회백색 본문, 저채도 그리드.
- 토픽별 액센트 (초안, `docs/design/` 에서 확정) — 페이지 정체성의 핵심. 공유 장면도 이 색으로 테마가 바뀐다:
  | 토픽 | 액센트 | 이유 |
  |---|---|---|
  | Dark Matter | 보라–인디고 | 보이지 않는 것, 깊은 우주 |
  | Neutrinos | 체렌코프 블루 (`~#3d7bff`) | 실제 체렌코프 빛의 색 |
  | Detectors | 시안 / 화이트 | 중립적 계측의 느낌 |
  | Semiconductor | 실리콘 그린–틸 + 구리색 | 웨이퍼와 배선 |
  | Heavy-Ion | 앰버 → 화이트 핫 | 10¹² K 의 화구(fireball) |
- 데이터 플롯 색은 색각이상 친화 팔레트 사용 (dataviz 가이드 적용).
- 에너지/온도 매핑은 지각적으로 균일한 컬러맵(inferno, viridis 계열)만 사용.

### 3.3 타이포그래피
- 한국어: **Pretendard** (가변 폰트, 서브셋 필요)
- 라틴(영/이): **Inter** 또는 동급 그로테스크 (Pretendard 의 라틴 글리프로 통일하는 것도 선택지)
- 데이터/라벨: **JetBrains Mono** 또는 **IBM Plex Mono**
- 수식: KaTeX (빌드 타임 렌더링, 클라이언트 JS 없음)
- 폰트는 자체 호스팅 (`public/fonts/`), 언어별로 필요한 서브셋만 로드.

### 3.4 스크롤 패턴 카탈로그
모든 토픽 페이지는 아래 패턴의 조합으로 만든다. 패턴을 컴포넌트화하는 것이 개발의 핵심이다.

| ID | 패턴 | 설명 | 사용 예 |
|---|---|---|---|
| P1 | **Pinned Scrub** | 장면이 고정되고 스크롤이 애니메이션 타임라인을 직접 구동 (Apple 제품 페이지 방식) | 납 원자핵 충돌, 검출기 분해 |
| P2 | **Sticky Graphic + Steps** | 한쪽에 고정 그래픽, 다른 쪽 텍스트 스텝이 지나갈 때마다 그래픽 상태 전환 | 대부분의 T1–T2 층 |
| P3 | **Scale Portal** | 화면 한 점으로 줌인하며 다음 층/스케일로 전환 | 층 사이 전환 (검출기 → 센서 → 픽셀) |
| P4 | **Big Number** | 풀스크린 숫자가 카운트업 / 단위 변환 | Hook 층 |
| P5 | **Explorable** | 사용자가 슬라이더/드래그로 직접 조작. 스크롤은 잠시 자유 | 충돌 파라미터, 바이어스 전압 |
| P6 | **Horizontal Gallery** | 세로 스크롤 → 가로 이동 | 검출기 종류 비교, 실험 시설 투어 |
| P7 | **Event Replay** | 단순 시뮬레이션으로 생성한 양식화된 이벤트를 시간순 재생 | Pb–Pb 충돌 궤적, Super-K 링 |
| P8 | **Schematic Plot Reveal** | 정성적 개형 그래프가 점진적으로 그려짐 (축은 대략적 스케일만, "개략도" 표시) | 회전 곡선, R_AA, 배제 곡선 |
| P9 | **Detection Walkthrough** | 검출기 단면도 위에서 입자 하나를 따라가며 신호가 생기는 과정을 단계별로 (§3.5) | 제논 TPC 의 S1·S2, 체렌코프 링, 역베타붕괴 지연 일치, TPC 궤적 |

### 3.5 실험을 다루는 방식 — Detection Walkthrough (P9)
실제 실험이 등장하는 모든 곳에 적용하는 표준 형식.

| 단계 | 내용 | 그림 |
|---|---|---|
| ① 무엇을 잡으려 하는가 | 한 문장 (예: "암흑물질이 제논 원자핵을 툭 치는 순간") | 검출기 외형 → 단면으로 전환 |
| ② 신호가 생기기까지 | **3–5 단계**. 입자 하나를 따라가며 각 단계에서 무슨 물리가 일어나는지 | 단면도 위 입자·빛·전하의 움직임 (스크롤로 진행) |
| ③ 무엇을 읽어내는가 | 신호 → 위치 / 에너지 / 입자 종류 / 방향 중 무엇을 아는가 | 신호 파형이나 이미지 → 재구성 결과 |
| ④ 핵심 트릭 하나 | 이 설계를 영리하게 만드는 아이디어 하나 (예: S2/S1 비율, 지연 일치, 링의 선명도) | 강조 애니메이션 또는 작은 위젯 |

- **다루는 것**: 원리, 신호의 흐름, 핵심 아이디어. 그림은 실제 장치를 단순화한 **원리도(schematic cutaway)**.
- **다루지 않는 것**: 상세 제원표, 하위 검출기 전체 목록, 협력단 규모·예산, 정확한 성능 수치.
- **실험 이름의 역할**: 원리마다 **대표 실험 하나** 를 그림의 주인공으로 쓴다. 같은 원리를 쓰는 다른 실험은 한 줄로만 언급 ("같은 원리: …").
- 실험 목록·지도(실험실 위치 등)는 짧은 부록 성격으로만, 원리 설명을 대신하지 않는다.
- 공유 장면(§2.5)과 결합: 같은 원리(예: TPC)는 어느 페이지에서든 같은 원리도를 쓰고, 페이지에 맞게 매질·색만 바꾼다.

### 3.6 모션 · 접근성 규칙
- `prefers-reduced-motion` 이면: 스크럽 애니메이션 → 정적 키프레임 이미지 + 페이드. 모든 정보는 모션 없이도 전달되어야 한다.
- WebGL 미지원 / 저사양: 사전 렌더링 이미지(또는 짧은 비디오)로 폴백.
- 모든 장면에 3개 언어 대체 텍스트. 키보드로 층 이동 가능. 색만으로 정보 전달 금지.

---

## 4. 기술 아키텍처

### 4.1 스택 (권장안)
| 영역 | 선택 | 이유 |
|---|---|---|
| 프레임워크 | **Astro** (static output) + TypeScript | 콘텐츠 중심 정적 사이트, 내장 i18n 라우팅, 필요한 곳에만 JS (islands), GitHub Pages 배포 용이 |
| 콘텐츠 | **MDX** + Astro Content Collections | 글 안에 `<Step>`, `<Scene>` 컴포넌트 삽입, 스키마 검증 |
| 스크롤 구동 | **GSAP + ScrollTrigger** | 핀/스크럽/타임라인의 업계 표준 (2025년부터 플러그인 포함 무료) |
| 부드러운 스크롤 | **Lenis** | ScrollTrigger 와 연동 |
| 3D / 파티클 | **Three.js** + 커스텀 GLSL | 충돌, 화구, 검출기 모델, 대량 파티클 |
| 2D 그래프 | **D3** (또는 SVG 직접 작성) | 개략 그래프와 위젯용 함수 그래프, 축/눈금 제어 |
| 수식 | **KaTeX** (remark-math + rehype-katex) | 빌드 타임 렌더링 |
| 위젯 UI | **Svelte** islands (선택) | 상태를 가진 작은 위젯. 순수 TS 로도 가능 — 결정 보류 (§8) |
| 배포 | **GitHub Actions → GitHub Pages** | 무료, repo 와 일체 |
| 품질 | Prettier, ESLint, **Playwright** (스모크 + 스크린샷), Lighthouse CI | |

### 4.2 핵심 설계 결정: "텍스트"와 "장면"의 분리
다국어 + 스크롤리텔링에서 가장 중요한 구조적 결정이다.

```
  src/content/topics/heavy-ion/ko.mdx ─┐
  src/content/topics/heavy-ion/en.mdx ─┼─→ <Step scene="hi.collision" state="lorentz">
  src/content/topics/heavy-ion/it.mdx ─┘          │
                                                    ▼
                         src/scenes/heavy-ion/collision.ts   (언어 무관, 상태 기계)
```

- **장면(scene)** 은 언어와 무관하다. 장면은 `state` 이름 목록과 상태 간 전환을 노출하는 모듈이다.
- **텍스트(MDX)** 는 언어별이다. 텍스트는 장면 ID와 state 이름으로만 장면을 참조한다.
- 따라서 번역자는 코드를 건드리지 않고, 개발자는 세 언어 모두에서 장면이 동일하게 동작함을 보장한다.
- 빌드 시 검증: 세 언어 MDX 가 **같은 장면/상태 시퀀스**를 참조하는지 체크하는 스크립트 (`scripts/`). 번역 누락/불일치를 잡는다.
- 장면 안에 들어가는 라벨(축 이름, 입자 이름)은 `src/i18n/` 의 키로 참조.
- 장면은 **토픽 전용**(`src/scenes/<topic>/`) 과 **공유**(`src/scenes/shared/`) 로 나뉜다. 여러 토픽이 쓰는 장면(TPC, 실리콘 센서 단면, 자기장 속 궤적 등)은 공유 쪽에 두고, 액센트 색 등 테마 파라미터만 페이지에서 넘긴다.
- Primer 도 같은 방식: `src/content/primers/<primer>/{ko,en,it}.mdx` 에 한 번 쓰고, 토픽 MDX 에서 `<Primer id="tpc" />` 로 삽입.

### 4.3 렌더링 · 성능 전략
- 페이지당 **WebGL 컨텍스트 1개** (공유 캔버스 + 장면 전환). 여러 컨텍스트는 모바일에서 죽는다.
- 장면 모듈은 **지연 로딩** (화면에 가까워질 때 dynamic import). 화면 밖 장면은 렌더 루프 정지.
- devicePixelRatio 상한 (예: 2), 저사양 감지 시 파티클 수 자동 감소.
- 성능 예산 (초안): 첫 화면 JS < 150 KB gz, LCP < 2.5 s (4G 모바일), 60 fps 목표 / 30 fps 하한.
- 3D 모델은 glTF + Draco/Meshopt 압축 (`public/models/`).

### 4.4 다국어 (i18n)
- 라우팅: Astro i18n, **모든 언어에 접두사** (`/ko/`, `/en/`, `/it/`). 루트 `/` 는 브라우저 언어 감지 후 안내.
- 기본 언어(fallback): `en` 권장 (§8 결정 필요).
- UI 문자열: `src/i18n/{ko,en,it}.json` (네비게이션, 버튼, 장면 라벨).
- 토픽 본문: `src/content/topics/<topic>/{ko,en,it}.mdx` — **토픽 우선 배치**로 세 번역이 나란히 있어 동기화가 쉽다.
- Primer: `src/content/primers/<primer>/{ko,en,it}.mdx` — 같은 배치.
- 용어집: `src/content/glossary/<term>.yaml` — 용어 하나에 세 언어를 함께 기록 → 용어 일관성 보장, 본문 툴팁의 원천.
- 숫자/단위 포맷: `Intl.NumberFormat` 로 로케일별 처리 (이탈리아어는 소수점 쉼표: `5,36 TeV`). 과학 표기(×10ⁿ)는 공통 헬퍼.
- 각 페이지에 `hreflang` 대체 링크, 언어별 OG 이미지.
- 번역 워크플로: §6 참조.

### 4.5 숫자 · 그래프 · 이미지
- **실제 측정 데이터는 쓰지 않는다.** 외부 데이터 가져오기·변환 파이프라인도 만들지 않는다.
- `src/data/` : 화면에 쓰는 **대표 수치 상수** 를 한곳에 모은 작은 파일들 (예: `T_QGP ≈ 10¹² K`, `실리콘 쌍생성 에너지 ≈ 3.6 eV`).
  세 언어가 같은 값을 쓰도록 하기 위한 것. 항목마다 짧은 근거 메모(교재·리뷰 이름) 정도만 단다.
- 그래프: 교재 수준의 **해석적 함수나 손으로 그린 개형** 으로 그린다 (예: 회전 곡선 = 원반 + 헤일로 모형 함수,
  Bethe–Bloch = 단순화된 공식). 실제 측정점·오차 막대는 그리지 않는다.
- 이벤트 디스플레이: 간단한 시뮬레이션(무작위 운동량 + 자기장 속 나선)으로 생성. "시뮬레이션된 예시" 라고 표시.
- `scripts/` : 시뮬레이션 이벤트 생성, 번역 동기화 검사 등 빌드 보조 스크립트.
- 이미지: **직접 생성한 비주얼** 을 우선. 외부 이미지는 라이선스 확인 후 (CERN CDS 는 대체로 CC-BY 4.0, NASA 는 대체로 퍼블릭 도메인) `about` 페이지에 크레딧.

### 4.6 디렉터리 구조
```
physics/
├── README.md
├── docs/                         기획 문서 (사이트에 포함되지 않음)
│   ├── PLAN.md                   ← 이 문서
│   ├── storyboards/              토픽별 · 허브 스토리보드 (층별 내용, 장면, 수치, 연계)
│   ├── design/                   비주얼 언어, 무드보드, 컬러/타이포 토큰 정의
│   └── i18n/                     번역 가이드, 용어 대조표 초안
├── public/                       그대로 서빙되는 정적 파일
│   ├── fonts/                    자체 호스팅 폰트 (서브셋)
│   ├── images/                   정적 이미지, 폴백 키프레임
│   ├── models/                   glTF 3D 모델 (검출기 등)
│   ├── data/                     미리 생성한 시뮬레이션 이벤트 등 (필요한 경우만)
│   └── og/                       언어 × 토픽별 공유 이미지
├── src/
│   ├── pages/                    라우트 ([lang]/index = 허브, [lang]/[topic] …)
│   ├── layouts/                  기본 레이아웃, 토픽 페이지 레이아웃
│   ├── components/
│   │   ├── ui/                   내비게이션, 언어 전환, Depth Gauge, 용어 툴팁, Deeper 박스
│   │   ├── scrolly/              스크롤 프리미티브: Topic, Layer, Step, Pin, Portal, BigNumber
│   │   ├── connections/          Primer, BridgeCard, RelatedTopics, 허브 토픽 지도
│   │   └── widgets/              Explorable 위젯 (슬라이더, 인터랙티브 플롯)
│   ├── scenes/                   WebGL/Canvas 장면 — 언어 무관
│   │   ├── shared/               렌더러, 카메라 리그, 파티클 시스템, 셰이더, 장면 레지스트리
│   │   │                         + 여러 토픽이 쓰는 공유 장면 (TPC, 실리콘 단면, 자기장 궤적 …)
│   │   ├── hub/
│   │   ├── dark-matter/
│   │   ├── neutrinos/
│   │   ├── detectors/
│   │   ├── semiconductor-detectors/
│   │   └── heavy-ion/
│   ├── content/
│   │   ├── topics/<topic>/{ko,en,it}.mdx
│   │   ├── primers/<primer>/{ko,en,it}.mdx
│   │   ├── glossary/<term>.yaml
│   │   └── connections.yaml      연결 지도 + Primer 사용처 (단일 출처)
│   ├── i18n/                     UI 문자열, 로케일 헬퍼
│   ├── data/                     대표 수치 상수 (세 언어 공통)
│   ├── lib/                      물리 유틸(단위 변환, 상대론 운동학, 개략 그래프 함수), 숫자 포맷, 스크롤 헬퍼
│   └── styles/                   디자인 토큰, 전역 CSS
├── scripts/                      시뮬레이션 이벤트 생성, 번역 동기화 검사
├── tests/                        Playwright 스모크/스크린샷 테스트
└── .github/workflows/            빌드 · 배포
```

---

## 5. 콘텐츠 계획 요약
상세는 각 스토리보드 문서 참조. 아래는 층별 뼈대. 각 토픽은 독립 페이지이며, 연결은 §2.5 를 따른다.

### 5.0 허브
짧은 히어로 ("보이지 않는 것을 보는 방법") → 스케일 축 위의 토픽 지도와 연결선 → 토픽 카드 목록.

### 5.1 중이온 물리 (Heavy-Ion Physics) — 7개 층
`hook` 우주의 첫 마이크로초를 실험실에서 (~10¹² K) →
`why` 쿼크 가둠, 초기 우주, 상태도 맛보기 →
`collision` 로렌츠 수축, 통과 vs 멈춤(에너지에 따라), 충돌 매개변수, 시간 진화 →
`fireball` 집단 흐름 (거의 완벽한 유체), 제트 소멸, 쿼코늄, 기묘도 →
`phase-diagram` **Beam Energy Scan**: QGP 와 보통 핵물질 사이, 임계점 탐색, 요동 · 방향 흐름 · QGP 신호의 소멸 →
`detection` 충돌형 vs 고정 표적, ALICE · STAR · CBM 이 입자를 잡는 원리 →
`frontier` 임계점 탐색의 다음 단계, 소형계, O–O/Ne–Ne, ALICE 3 · EIC, 중성자별.

### 5.2 암흑물질 (Dark Matter) — 6개 층
`hook` 물질의 ~85% 는 보이지 않는다 → `evidence` 회전 곡선, 중력 렌즈, Bullet Cluster, CMB →
`candidates` WIMP, 액시온, … → `search` 직접 / 간접 / 충돌기 세 갈래 →
`direct-detection` 액체 제논 TPC 가 핵 되튐을 잡는 원리 (S1·S2), 다른 기술들의 원리 →
`frontier` 배경과의 싸움, 지하 실험실 (한국 · 이탈리아), 배제 곡선과 neutrino fog, 액시온.

### 5.3 중성미자 (Neutrinos) — 5개 층
`hook` 엄지손톱을 매초 수백억 개가 관통 → `ghost` 유령 입자, 세 가지 맛, 진동 →
`sources` 출처와 반응 방식 →
`detection` 검출 방법별 원리 그림 (방사화학, 물 체렌코프, 액체 섬광체 + 역베타붕괴, 액체 아르곤 TPC, 중성미자 망원경, CEvNS) →
`frontier` 질량 순서, CP 위반, 0νββ 를 잡는 원리, 고에너지 우주 중성미자.

### 5.4 반도체 검출기 (Semiconductor Detectors) — 6개 층
`hook` 휴대폰 카메라와 LHC 는 같은 기술을 쓴다 → `intuition` 실리콘이 입자를 전기로 →
`mechanism` 밴드갭, p–n 접합, 공핍층, 드리프트, 신호 유도 →
`zoo` 종류별로 신호가 생기는 원리 (스트립, 픽셀, MAPS, LGAD, HPGe, CCD, SiPM) →
`research` 센서 하나가 검출기에 들어가기까지 (시뮬레이션, 측정, 테스트빔, 방사선 손상) →
`case-its3` 휘어진 실리콘 (ALICE ITS3), CBM 의 실리콘, 미래.

### 5.5 검출기의 기본 원리 (Detectors) — 5개 층
`hook` 우리는 입자가 남긴 흔적을 볼 뿐이다 → `history` 안개상자에서 전자 검출기까지 →
`interactions` 물질과의 상호작용 (이온화, 광자, 샤워, 체렌코프) →
`measurement` 신호 변환과 측정량, 양파 구조, 입자별 서명 →
`design` 트리거, 분해능의 트레이드오프, 시뮬레이션.

---

## 6. 글쓰기 · 번역 · 과학 검증 워크플로

### 6.1 작성 순서
1. 스토리보드 (`docs/storyboards/`) 확정 — 층, 스텝, 장면 상태, 수치, 출처.
2. **마스터 언어로 본문 작성.** 권장: 영어 마스터 (물리 용어의 원어가 영어, 레퍼런스와 대조 용이). 대안: 한국어 마스터 — §8 결정.
3. 용어집 업데이트 → 나머지 두 언어로 번역.
4. 원어민 검토 (특히 이탈리아어) + 물리 내용 검토.

### 6.2 번역 원칙
- **직역이 아닌 각색(transcreation)**: 헤드라인은 각 언어에서 가장 강한 표현으로. 의미와 수치는 동일하게.
- 용어 첫 등장 시 원어 병기 (예: 쿼크-글루온 플라스마(Quark–Gluon Plasma, QGP)).
- 한국어: 표준 학술 용어(한국물리학회 용어) 우선, 대중적 표기가 다르면 병기.
- 이탈리아어: INFN / 이탈리아 대학 교재의 표준 용어 확인.
- 장면 상태 시퀀스는 세 언어가 **반드시 동일** (빌드 검사로 강제).

### 6.3 과학 정확성
- 기준: **"학부 교재와 모순되지 않을 것."** 정밀도보다 개념의 정확성이 우선.
- 수치는 자릿수가 맞으면 충분하다. 대표 수치는 `src/data/` 에 모아 세 언어에서 일관되게 쓴다.
- 단순화(비유)는 허용하되, "틀린 비유" 는 금지. 각 비유 옆 `Deeper` 박스에서 한계를 밝힌다.
- 개략 그래프는 개형(증가/감소, 피크 위치, 대략적 크기)이 실제와 맞아야 한다.
- 토픽별로 해당 분야 동료 1인이 훑어보는 정도의 리뷰. Primer 는 원본 토픽의 리뷰어가 함께 본다.
- 최근 실험 이야기는 시점을 표시 ("2025년 기준").
- 페이지 말미에 **더 읽을거리** (학부생이 읽을 수 있는 교재·리뷰·공식 교육 페이지) 3–5개.

---

## 7. 로드맵

| 단계 | 내용 | 완료 조건 |
|---|---|---|
| **Phase 0 — 기획** (현재) | 마스터 플랜, 스토리보드 초안, 디렉터리 구조 | 이 문서 + 스토리보드 6종 리뷰 완료, §8 결정 |
| **Phase 1 — 기반** | Astro 스캐폴드, i18n 라우팅, 디자인 토큰, 폰트, GitHub Pages 배포 파이프라인, 허브 뼈대 (토픽 카드 "곧 공개") | 3개 언어 허브가 `isaac-kwon.github.io/physics` 에 배포됨 |
| **Phase 2 — 스크롤 엔진 + 연계 장치** | `scrolly/` 프리미티브 (P1–P8), 공유 WebGL 캔버스, 장면 레지스트리, Depth Gauge, reduced-motion 폴백 / `connections/` 컴포넌트 (Primer, BridgeCard, RelatedTopics), `connections.yaml` 검사 | 데모 페이지에서 모든 패턴 동작, 모바일 60/30 fps |
| **Phase 3 — 첫 토픽 페이지 출시** | **Heavy-Ion 페이지 전체 (7개 층)** 를 3개 언어로 완성. 이 페이지가 쓰는 Primer (`tpc`, `particle-id`, `silicon-sensor` 등) 도 함께 작성 | 단독으로 공개 가능한 품질. 허브에서 활성화 |
| **Phase 4 — 토픽별 순차 출시** | 한 번에 한 페이지씩 완성 → 출시. 권장 순서: Semiconductor → Detectors → Neutrinos → Dark Matter. 출시할 때마다 해당 페이지로 향하는 Bridge 가 "곧 공개" → 활성으로 바뀐다 | 페이지마다 스토리보드 100% + 리뷰 완료 후 출시 |
| **Phase 5 — 마감 · 확장** | 번역 원어민 검토, 성능/접근성 감사, OG 이미지, 용어집 페이지, about. 선택: 허브의 줌 연출 (D5) | Lighthouse ≥ 90 (Perf/A11y/SEO) |

토픽 페이지가 독립적이므로 **완성된 페이지부터 바로 공개**한다. 모든 토픽이 끝날 때까지 기다리지 않는다.

---

## 8. 결정이 필요한 사항 (Open Decisions)
| # | 질문 | 권장 | 비고 |
|---|---|---|---|
| D1 | 기본(fallback) 언어 | **en** | 국제 유입 기준. 한국 독자 중심이면 ko |
| D2 | 마스터 작성 언어 | **en** | 용어 정확성. 저자가 한국어로 더 빨리 쓴다면 ko 도 무방 |
| D3 | 위젯 UI 구현 | **Svelte islands** | 순수 TS 웹 컴포넌트도 가능. 위젯 수가 적으면 순수 TS |
| D4 | 첫 출시 토픽 | **Heavy-Ion** | 비주얼이 가장 강하고 Primer 를 많이 써서 연계 장치까지 검증됨. 대안: Semiconductor |
| D5 | 허브의 "우주 → 쿼크" 줌 연출 | **1차 출시에서 제외** | 토픽 지도만으로 시작. 모든 토픽 출시 후 선택적으로 추가 |
| D6 | 도메인 | `isaac-kwon.github.io/physics` | 커스텀 도메인 원하면 Phase 1 에서 설정 |
| D7 | 분석 도구 | 없음 또는 쿠키 없는 도구 (Plausible / GoatCounter) | 개인정보 고지 필요 여부 |
| D8 | 저자 소개·소속 표기 | about 페이지 | 소속 실험(ALICE 등) 명칭 사용 시 공식 가이드라인 확인 |

---

## 9. 리스크
| 리스크 | 영향 | 대응 |
|---|---|---|
| 스크롤 애니메이션이 모바일에서 버벅임 | 핵심 경험 손상 | 단일 컨텍스트, 지연 로딩, 품질 자동 하향, 실기기 테스트 조기 시작 (Phase 2) |
| 3개 언어 동기화 붕괴 | 언어별 내용 불일치 | 토픽 우선 배치 + 장면 시퀀스 빌드 검사 + 용어집 |
| 독립 페이지 사이의 설명 중복·불일치 | 같은 개념이 페이지마다 다르게 설명됨 | Primer 와 공유 장면으로 한 번만 작성 |
| 연결 링크가 흐름을 끊음 | 이탈 증가 | Bridge 는 여백에, Related Topics 는 맨 끝에. 본문 안 하이퍼링크 최소화 |
| 페이지 간 연결 깨짐 (앵커 변경, 미출시 페이지) | 깨진 링크 | `connections.yaml` 단일 출처 + 빌드 검사 + "곧 공개" 표시 |
| 과학적 오류 | 신뢰 상실 | 학부 교재 기준 검토, 동료 리뷰, 시점 명시 |
| 깊이가 학부 수준을 넘어감 | 학부생도 이탈 | 층별 단어 예산, "학부 교재에 나오는가?" 체크 |
| 범위 팽창 (5토픽 × 5층 × 3언어) | 영원히 미완성 | 토픽 단위 순차 출시 (완성된 페이지부터 공개) |
| 외부 이미지 라이선스 | 법적 문제 | 자체 생성 비주얼 우선, 크레딧 관리 |
| 화려함이 이해를 방해 | 교육 효과 저하 | "One idea per screen", 모든 모션에 물리적 의미 원칙 |
