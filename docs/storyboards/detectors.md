# Detectors — 검출기의 기본 원리

- 경로: `/{lang}/detectors/`
- 장면 디렉터리: `src/scenes/detectors/`
- 스케일 여정: 거대한 범용 검출기 (수십 m) → 층 하나 → 물질 속 입자 하나의 경로 → 원자 하나의 이온화
- 액센트: 시안 / 화이트
- 핵심 메시지: **"우리는 입자를 본 적이 없다. 입자가 물질에 남긴 흔적을 읽을 뿐이다."**
- 성격: 그 자체로 완결된 독립 토픽 ("보이지 않는 것을 보는 기술"). 다른 페이지의 선수 과목이 아니다.
  다만 여러 Primer 의 **원본** 이므로, 이 페이지의 해당 내용이 바뀌면 Primer 도 함께 갱신한다.

## 층별 구성
층 5개: `hook` (T0) → `history` (T1) → `interactions` (T2) → `measurement` (T3) → `design` (T4)

### 1. Hook — `hook` · T0
- 비주얼: 어둠 속 한 점에서 궤적 다발이 터져 나옴 (이벤트 디스플레이), 그 뒤로 거대한 검출기 실루엣 (P1)
- 문장: "입자는 너무 작아서 볼 수 없다. 그래서 우리는 그것이 지나간 자리를 본다."

### 2. 흔적의 역사 — `history` · T1
P6 가로 갤러리, 연대기:
- 섬광 스크린 (Rutherford, 1909) — 눈으로 깜빡임 세기
- **안개상자** (Wilson, 1911) — 과포화 증기 속 물방울 궤적. 양전자 (1932), 뮤온 (1936) 발견
- 원자핵 건판 — 파이온 발견 (1947)
- **거품상자** (Glaser, 1952) — 수많은 공명 입자, 중성류 (Gargamelle, CERN 1973)
- 와이어 체임버 (Charpak, 1968) → **전자 검출기 시대**: 사진이 아니라 데이터
- 실리콘, 결정 열량계, 거대 하이브리드 검출기 (오늘)
- 인터랙션 아이디어: 집에서 만드는 안개상자 (우주선 뮤온) 짧은 영상/시뮬레이션

### 3. 물질과의 상호작용 (모든 검출의 출발점) — `interactions` · T2
Primer 원본: `ionization` (1번), `cherenkov` (6번).
P2 sticky + steps, 오른쪽에 "물질 블록과 입자 하나" 장면.
1. **하전 입자: 이온화** — 원자 전자를 떼어내며 조금씩 에너지 잃음
   - 위젯(P5): Bethe–Bloch 곡선 — 운동량 슬라이더, 입자 종류(π, K, p, e) 선택 → MIP 지점, 상대론적 상승
   - Landau 분포 (긴 꼬리) 간단 소개
2. **전자: 제동복사(bremsstrahlung)** — 복사 길이 X₀
3. **광자: 세 가지 운명** — 광전효과 (저에너지) / 콤프턴 산란 / 쌍생성 (>1.022 MeV) → 에너지에 따른 우세 영역 그래프
4. **샤워** — 전자기 샤워 (e → γ → e⁺e⁻ → …) 의 분기 애니메이션, 하드론 샤워는 더 크고 불규칙
5. **중성 입자** — 중성자 (핵 반응), 중성미자 (거의 아무것도 안 함 → Bridge: Neutrinos)
6. **체렌코프 · 전이 복사** — 속도에 대한 문턱 현상

### 4. 흔적을 신호로, 신호를 물리량으로 — `measurement` · T3
Primer 원본: `scintillation`, `tpc`, `magnetic-tracking`, `particle-id`. 삽입: `silicon-sensor`, `standard-model` (입자별 서명 앞).

**신호 변환 3가지**:
- 이온화 전하 수집 (기체: 비례/와이어/TPC, **반도체** — Primer `silicon-sensor` → Bridge: Semiconductor)
- 섬광 → 광센서 (PMT, SiPM)
- 체렌코프 빛 → 광센서

**측정하는 4가지 양**:
| 양 | 방법 | 시각화 |
|---|---|---|
| 궤적 · 운동량 | 자기장 속 휘어짐: p [GeV/c] = 0.3 · B [T] · R [m] | 위젯: B 와 p 조절 → 궤적 곡률, 부호로 전하 판별 |
| 에너지 | 열량계: 입자를 완전히 멈춰 모든 에너지를 흡수 | 샤워가 블록 안에서 쌓이는 히트맵 |
| 입자 식별 (PID) | dE/dx, 비행 시간(TOF), 체렌코프 각, 전이복사 | 같은 운동량, 다른 질량 → 다른 신호 |
| 시간 | 빠른 신호, 수십 ps 정밀도 | 시계 비유 |

**양파 구조** (P1 핀 고정, Apple 스타일 분해 애니메이션):
빔 파이프 → 꼭짓점 검출기 → 트래커 → 전자기 열량계 → 하드론 열량계 → 자석 → 뮤온 체임버
- 각 층이 한 겹씩 떨어져 나가며 이름·역할 표시
- **입자별 서명** 위젯(P5): 광자 / 전자 / 뮤온 / 하전 하드론 / 중성 하드론 / 중성미자 를 쏘면 어떤 층에 어떤 흔적을 남기는지 → 마지막에 "흔적만 보고 입자 맞히기" 퀴즈

### 5. 실제 검출기를 설계한다는 것 — `design` · T4
- **트리거와 DAQ**: LHC 는 40 MHz 충돌 → 저장 가능한 건 kHz 수준 → 무엇을 버릴지 실시간 결정. 최근 흐름: 트리거 없는 연속 판독 (ALICE Run 3)
- **분해능의 트레이드오프**: 물질량(다중 산란) vs 신호 크기, 판독 속도 vs 전력 vs 냉각, 방사선 내성, 비용
- 운동량 분해능의 직관: 궤적이 길수록(레버 암), 자기장이 셀수록, 점 위치가 정확할수록 좋아진다 — 그리고 고운동량일수록 나빠진다 (거의 직선이므로)
- **시뮬레이션**: Geant4 — 실제 검출기 설계는 수십억 개의 가상 입자로 먼저 만들어진다
- 미래: 타이밍 검출기 (4D 트래킹), 머신러닝 재구성

## 장면 / 상태
- `det.event-burst`
- `det.history` — 시대별 갤러리
- `det.matter-block` — `ionization`, `brems`, `photon-pe`, `photon-compton`, `photon-pair`, `em-shower`, `had-shower`, `cherenkov`
- `det.onion` — `assembled`, `exploded`, 층별 하이라이트
- `det.signatures` — 입자별 상태

## 위젯
- `BetheBloch` · `TrackCurvature` · `ParticleSignatures` (+ 퀴즈 모드)

## 대표 수치 (`src/data/`, 자릿수 수준)
- MIP 의 에너지 손실: ~2 MeV/(g/cm²) (물질 종류에 거의 무관)
- 쌍생성 문턱: 1.022 MeV
- 복사 길이 X₀: 납 ~0.5 cm, 실리콘 ~10 cm, 물 ~36 cm
- 운동량–곡률 관계: p [GeV/c] ≈ 0.3 · B [T] · R [m]
- LHC 충돌 빈도 ~40 MHz → 저장 가능 ~kHz

## 그래프 (모두 개략도 / 교재 공식으로 계산)
- Bethe–Bloch: 단순화된 공식으로 계산한 곡선 (1/β² 감소 → 최소 → 완만한 상승)
- 광자 상호작용 우세 영역: 에너지 vs 원자번호 평면의 세 영역 개형

## 참고 자료
작성 근거 (저자용, 개념 확인)
- PDG Review: "Passage of Particles Through Matter"
- H. Kolanoski & N. Wermes, *Particle Detectors: Fundamentals and Applications* (2020)

더 읽을거리 (독자용, 학부 수준 — 최종 선정 필요)
- W. R. Leo, *Techniques for Nuclear and Particle Physics Experiments*
- C. Grupen & B. Shwartz, *Particle Detectors*
- CERN 의 대중용 검출기 소개 페이지

## 연계 (PLAN §2.5)
- **삽입하는 Primer**: `silicon-sensor` · `standard-model` (`measurement`)
- **이 페이지가 원본인 Primer**: `ionization`, `cherenkov` (`interactions`), `scintillation`, `tpc`, `magnetic-tracking`, `particle-id` (`measurement`)
- **Bridge (나가는 연결)** — "이 기술이 실제로 쓰이는 곳"
  - `interactions` (중성미자) → Neutrinos `#ghost`
  - `measurement` (반도체) → Semiconductor `#mechanism`
  - `measurement` (체렌코프 · 섬광 사용처) → Neutrinos `#detection`
  - `measurement` (TPC 사용처) → Dark Matter `#direct-detection`, Heavy-Ion `#detection`
- **공유 장면 · 위젯**: `BetheBloch` (Heavy-Ion 과 공유), `shared.magnetic-track`, `shared.tpc` — 시안 테마
- **Related Topics**: Semiconductor Detectors, Neutrinos, Heavy-Ion
