# Heavy-Ion Physics — 중이온 물리의 기본

- 경로: `/{lang}/heavy-ion/`
- 장면 디렉터리: `src/scenes/heavy-ion/`
- 스케일 여정: 빅뱅 직후 우주 → 가속기 (LHC · RHIC · FAIR) → 두 원자핵 (~14 fm) → 화구 안의 쿼크와 글루온
- 액센트: 앰버 → 화이트 핫 (높은 바리온 밀도 영역은 짙은 적색 계열로 구분)
- 핵심 메시지: **"원자핵을 부딪쳐 우주의 첫 마이크로초를 다시 만들고, 충돌 에너지를 바꿔 가며 쿼크 물질과 보통 핵물질 사이의 경계를 찾는다."**
- 첫 출시 후보 (PLAN §8 D4): 가장 비주얼이 강하고, 모든 스크롤 패턴과 많은 Primer 를 사용한다.
- 특정 실험 하나의 홍보 페이지가 되지 않도록, **ALICE · STAR · CBM** 을 중심으로 여러 실험을 함께 다룬다.

## 층별 구성
층 7개: `hook` (T0) → `why` (T1) → `collision` (T2) → `fireball` (T3) → `phase-diagram` (T3) → `detection` (T3) → `frontier` (T4)

### 1. Hook — `hook` · T0
- 비주얼: 칠흑 속 두 개의 빛나는 원반이 서로 다가와 충돌 → 하얗게 타오르는 화구 → 수천 개의 궤적이 사방으로 (P1 스크럽)
- 숫자 (P4): **~10¹² K** — 태양 중심 (~10⁷ K) 의 **약 10만 배 이상**
  - 캡션: "인류가 만든 가장 뜨거운 물질"

### 2. 왜 이런 일을 하는가 — `why` · T1
P2 sticky + steps. Primer `standard-model` (쿼크의 자리).
1. **쿼크는 혼자 있을 수 없다 (가둠, confinement)**: 양성자 속 쿼크를 떼어내려 하면 고무줄처럼 에너지가 쌓이다가 새 쿼크 쌍이 생긴다 → 애니메이션
2. **하지만 아주 뜨겁거나, 아주 빽빽하면?** 쿼크와 글루온이 자유로워진 상태 = **쿼크-글루온 플라스마 (QGP)**
3. **우주는 한때 QGP 였다**: 빅뱅 후 수 마이크로초까지 → 타임라인 (QGP → 양성자·중성자 → 원자핵 → 원자 …)
4. **물질의 상태도 맛보기**: 얼음–물–수증기처럼 핵물질에도 상태도가 있다. 두 축 = **온도** 와 **바리온 밀도** (얼마나 빽빽하게 양성자·중성자가 있는가).
   - 이 층에서는 지도만 보여주고, "이 지도의 빈칸" 은 `phase-diagram` 층에서 다시 탐험한다는 복선
- 이 층의 요약이 Primer `quarks-gluons` 의 원본
- 한 줄 요약: "강한 상호작용(QCD)이 수많은 입자의 집단에서 어떻게 행동하는지 알 수 있는 유일한 실험실"

### 3. 충돌하면 무슨 일이 일어나는가 — `collision` · T2
P1 핀 고정 스크럽 — 이 페이지의 중심 시퀀스. 스크롤 = 시간 (fm/c 단위 시계 표시, 1 fm/c ≈ 3 × 10⁻²⁴ s).
1. **가속과 로렌츠 수축**: 원자핵이 얇은 팬케이크로 (LHC 에서 γ 는 수천)
   - 위젯(P5) `CollisionEnergy`: 에너지 슬라이더 (FAIR → RHIC → LHC)
     - 높은 에너지: 얇은 팬케이크가 서로 **통과** 하고, 가운데에 뜨겁고 바리온이 거의 없는 물질이 남는다
     - 낮은 에너지: 두툼한 원자핵이 서로 **멈춰 세움 (baryon stopping)** → 뜨겁지만 **바리온이 빽빽한** 물질
     - `phase-diagram` 층의 복선
2. **충돌 매개변수 (impact parameter) 와 중심도 (centrality)**: 정면 충돌 vs 스치는 충돌. 참여자(participants) vs 관객(spectators)
   - 위젯(P5) `ImpactParameter`: b 슬라이더 → 겹침 영역이 원 → 아몬드 모양으로 (`fireball` 층의 타원 흐름 복선)
   - Deeper: Glauber 모델의 아이디어 — 원자핵을 핵자들의 무작위 배치로 보고, 겹치는 핵자 수(N_part)를 센다
3. **시간 진화** (스크럽, 고에너지 기준):
   | t (fm/c) | 단계 |
   |---|---|
   | 0 | 충돌, 초기 상태 |
   | ~0–1 | 전평형 → 빠른 열평형화 |
   | ~1–10 | **QGP — 유체로서 팽창하고 식음** |
   | ~10 | **강입자화**: 쿼크가 다시 강입자로 갇힘 (화학적 동결) |
   | ~10–20 | 강입자 기체, 탄성 충돌 → **운동학적 동결** |
   | ≫ | 입자들이 자유롭게 날아가 검출기로 (약 10¹⁵ fm/c 후 검출기 도착) |
4. "우리는 화구를 직접 보지 못한다. **마지막에 튀어나온 입자들만으로** 10⁻²³ 초 동안의 일을 재구성해야 한다." → 다음 층으로

### 4. 화구(QCD fireball) 안에서의 작용과 그 증거 — `fireball` · T3
주로 고에너지(RHIC 최고 에너지, LHC)의 이야기. 각 현상 = 하나의 "단서" 카드. 비주얼 + 개략 그래프(P8).
1. **집단 흐름 (collective flow) — 거의 완벽한 유체**
   - 아몬드 모양 겹침 영역 → 짧은 축 방향 압력 기울기가 큼 → 입자가 그 방향으로 더 많이 → **타원 흐름 v₂**
   - 공간 비등방성 → 운동량 비등방성 변환 애니메이션 (이 페이지의 가장 아름다운 장면 후보)
   - 결론: QGP 는 기체가 아니라 **점성이 극히 낮은 액체**, η/s 가 이론적 하한 1/4π 근처
   - 위젯(P5) `FlowDemo`: 이심률 → v₂
2. **제트 소멸 (jet quenching)**
   - 고에너지 쿼크/글루온이 화구를 뚫고 지나가며 에너지를 잃음 → 한쪽 제트만 보이는 비대칭 이벤트
   - R_AA 개략도: 하드론은 1 보다 훨씬 작음 (억제), 광자·Z 는 1 근처 (색전하가 없으므로 → 대조군)
3. **쿼코늄 억제와 재생**
   - J/ψ (cc̄), Υ (bb̄) 는 화구 속에서 "녹는다" (색 차폐) — 결합이 약한 상태부터 순차적으로 → **온도계**
   - LHC 에서는 c 쿼크가 많아 J/ψ 가 다시 만들어지기도 (재생성)
4. **기묘도 증가 (strangeness enhancement)**: s 쿼크를 포함한 강입자가 늘어남
5. **열복사 & 통계적 강입자화**: 직접 광자/렙톤 쌍 = 화구의 온도계, 강입자 수 비율은 하나의 온도와 바리온 화학 퍼텐셜로 놀랍도록 잘 설명

### 5. QGP 와 보통 핵물질 사이 — Beam Energy Scan — `phase-diagram` · T3
이 페이지의 두 번째 중심 시퀀스. P1 핀 고정: 화면 가득한 **QCD 상태도** 위에서 스크롤에 따라 탐험.
- 축: 세로 = 온도 T, 가로 = 바리온 밀도 (또는 바리온 화학 퍼텐셜 μ_B)

1. **지도의 알려진 곳**
   - 왼쪽 위: 초기 우주와 LHC — 뜨겁고 바리온이 거의 없음. 여기서는 QGP ↔ 강입자 기체가 **급격한 상전이가 아닌 매끄러운 교차(crossover)** (격자 QCD 계산)
   - 오른쪽 아래: **보통 핵물질** — 우리 몸을 이루는 원자핵 (T ≈ 0, 바리온 밀도 = 정상 핵밀도). 그 근처의 **핵 액체–기체 상전이** (낮은 온도의 "끓는" 원자핵)
   - 더 오른쪽: 중성자별 내부 (차갑고 극도로 빽빽함). 중성자별 병합은 뜨겁고 빽빽한 영역
2. **지도의 빈칸**: 높은 바리온 밀도에서 QGP 와 강입자 물질의 경계는?
   - 이론적 기대: 어딘가에서 매끄러운 교차가 **1차 상전이** 로 바뀌고, 그 끝점이 **임계점 (critical point)** — 물의 임계점처럼
   - 격자 QCD 는 이 영역을 직접 계산하기 어렵다 → **실험으로 찾아야 한다**
3. **Beam Energy Scan 의 아이디어**: 충돌 에너지를 낮출수록 화구는 덜 뜨겁고 더 빽빽해진다 (`collision` 층의 stopping)
   - 위젯(P5) `EnergyScan`: √s_NN 슬라이더 (수천 GeV → 수 GeV) → 상태도 위 화구의 경로와 **동결 지점** 이 왼쪽 위에서 오른쪽 아래로 이동
   - 각 에너지의 동결 지점들이 이어져 하나의 곡선이 됨 (개략도, 통계적 강입자화 모형)
4. **어떤 신호를 찾는가** (각 1 스텝, 개략 그래프)
   - **보존량의 요동**: 사건마다 (양성자 수 − 반양성자 수) 가 얼마나 흔들리는가. 임계점 근처에서는 요동이 크게 커질 것으로 기대 → 에너지에 따라 단조롭지 않은 변화를 찾는다
     - Deeper: 분포의 고차 모멘트(cumulant) 비율, 왜 고차일수록 상관 길이에 민감한가 (정성적)
   - **방향 흐름 (directed flow) 의 기울기**: 1차 상전이가 있으면 압력이 "물러지는(softest point)" 구간이 생겨 흐름의 부호가 바뀔 수 있다
   - **QGP 신호가 꺼지는 지점**: 에너지를 충분히 낮추면 `fireball` 층의 신호(쿼크 수 스케일링, 제트 억제 등)가 사라진다 → "QGP 가 더 이상 만들어지지 않는 에너지는 어디인가"
   - **렙톤 쌍 (dileptons)**: 빽빽한 물질 속을 그대로 빠져나오는 온도계 (HADES, CBM)
5. **누가 탐험하는가** — 상태도 위에 각 실험이 덮는 영역을 띠로 표시
   | 시설 · 실험 | 방식 | 대략적 영역 |
   |---|---|---|
   | LHC · ALICE | 충돌형 | 최고 에너지, 바리온 밀도 ≈ 0 |
   | RHIC · **STAR** (BES-I/II) | 충돌형 + 고정 표적 모드 | 수 GeV ~ 200 GeV — 지도를 가장 넓게 훑음 |
   | SPS · NA61/SHINE | 고정 표적 | 중간 에너지, 원자핵 크기도 바꿔 가며 |
   | GSI · HADES | 고정 표적 | 낮은 에너지, 높은 밀도 |
   | **FAIR · CBM** | 고정 표적, 초고빈도 | 수 GeV — 가장 빽빽한 영역을 아주 많은 충돌로 정밀하게 |
   | NICA · MPD/BM@N | 충돌형/고정 표적 | 수 GeV |
   | (J-PARC-HI) | 고정 표적 (계획) | 높은 밀도 |
6. **현재 상황 (시점 표시)**: 흥미로운 경향이 보고되었으나 임계점의 존재는 **아직 결론 나지 않았다**. STAR BES-II 결과와 FAIR 의 CBM 가동이 다음 단계.

### 6. 어떻게 검출하는가 — `detection` · T3
다른 페이지를 읽지 않아도 이해되도록 Primer 를 가장 많이 쓰는 층 (`magnetic-tracking`, `tpc`, `particle-id`, `silicon-sensor`).
1. **두 가지 기하학** (P1, 나란히 비교): 
   - **충돌형 (collider)**: 두 빔이 정면 충돌 → 입자가 사방으로 → 충돌점을 둘러싼 **원통형 검출기** (ALICE, STAR, sPHENIX, MPD)
   - **고정 표적 (fixed target)**: 빔이 얇은 표적에 충돌 → 입자가 앞쪽 원뿔로 쏠림 → **앞쪽으로 길게 늘어선 검출기** (CBM, HADES, NA61/SHINE)
2. **Detection Walkthrough (P9) — 입자 하나의 여정** (충돌형 원통 검출기 원리도, ALICE · STAR 공통)
   - ① 무엇을: 화구에서 튀어나온 하전 입자 하나가 **어디서 태어났고, 운동량이 얼마이고, 무슨 입자인지**
   - ② 신호가 생기기까지
     1. **실리콘 픽셀 층** (충돌점 바로 바깥): 지나간 자리의 점 몇 개 → 태어난 위치(꼭짓점). 조금 떨어진 곳에서 태어났다면 무거운 입자가 붕괴한 흔적 — Primer `silicon-sensor`
     2. **자기장 속 휘어짐**: 솔레노이드 자석 안에서 궤적이 원호를 그림 → 곡률 = 운동량, 휘는 방향 = 전하 — Primer `magnetic-tracking`
     3. **TPC 기체 속 전리**: 입자가 기체 분자를 이온화 → 전자들이 전기장을 따라 끝판으로 표류 → 도착 위치(2D) + 도착 시간(깊이) = **3D 궤적**. 전자 수 = 단위 길이당 에너지 손실(dE/dx) — Primer `tpc`
     4. **비행 시간 (TOF)**: 바깥 층까지 걸린 시간 → 속도
   - ③ 읽어내는 것: 운동량(곡률) + 속도(dE/dx 또는 TOF) → **질량 → 입자 종류** (π, K, p …)
   - ④ 핵심 트릭: "같은 운동량이라도 무거운 입자는 느리고, 기체에 더 많은 흔적을 남긴다" — 위젯으로 운동량 고정 후 입자만 바꿔 보기
3. **고정 표적은 무엇이 다른가 (CBM 원리도)**
   - 입자가 앞쪽 좁은 원뿔로 쏠림 → 검출기 층을 빔 방향으로 줄지어 세움
   - 매우 높은 충돌 빈도 → 빠른 **실리콘 트래커** (MAPS 픽셀 + 실리콘 스트립) 가 자기장 속 궤적을 담당
   - 핵심 트릭: 충돌이 너무 잦아 "충돌 하나씩 골라 저장" 할 수 없다 → 모든 신호에 시간 도장을 찍어 흘려보내고, **컴퓨터가 시간으로 충돌을 다시 나눈다** (free-streaming) — 시간 축 위에서 섞인 점들이 충돌별로 색이 갈라지는 애니메이션
   - 같은 원리의 다른 실험 한 줄: HADES, NA61/SHINE, (STAR 고정 표적 모드)
   - 실리콘 부분 → Bridge: Semiconductor
4. **이벤트 재생** (P7): 고에너지 중심 충돌(수천 개 궤적, 원통형)과 저에너지 고정 표적 충돌(수백 개 궤적, 앞쪽 원뿔)을 나란히 — 간단한 시뮬레이션, "시뮬레이션된 예시" 표시
5. **입자 식별 정리**: dE/dx vs p 개략도에서 e, π, K, p 밴드가 갈라지는 모습 → Primer `particle-id` + Bridge: Detectors (Bethe–Bloch). BES 의 양성자 요동 측정은 이 식별에 달려 있다
6. **분석의 사고방식**: 중심도별로 나누기 → 관측량 측정 → 이론 모델(유체역학 등)과 비교 → 화구의 성질(점성, 온도, 바리온 밀도) 추정. "결과에서 원인을 거꾸로 추론한다" 는 흐름만 보여준다

### 7. 최전선 — `frontier` · T4
- **임계점 탐색의 다음 단계**: STAR BES-II 분석, FAIR SIS100 에서 CBM 가동 (시점 확인 필요), NICA
- **소형계의 집단성**: pp, p–Pb 고다중도에서도 흐름 같은 신호 — QGP 의 최소 크기는?
- **O–O, Ne–Ne 충돌 (LHC 2025)**: 원자핵 모양이 흐름에 남기는 흔적
- **ALICE 3** (2030년대), **EIC** (전자–이온 충돌기, 원자핵 내부의 글루온 지도)
- **천체물리와의 만남**: 중성자별 병합의 중력파 관측이 높은 밀도 영역의 상태방정식을 함께 제한
- 실험 시설 세계 지도 (P6): CERN, BNL, GSI/FAIR, JINR, J-PARC

## 장면 / 상태
- `hi.fireball-hero`
- `hi.confinement` — `string`, `stretch`, `break`
- `hi.cosmic-timeline`
- `hi.collision` — `approach`, `lorentz`, `impact`, `initial`, `preeq`, `qgp`, `hadronization`, `freezeout`, `free-stream`
- `hi.stopping` — `transparent` (고에너지), `stopped` (저에너지)
- `hi.flow` — `almond`, `pressure`, `momentum-anisotropy`, `v2-plot`
- `hi.jet` — `dijet`, `quenched`, `raa-plot`
- `hi.quarkonium` — `bound`, `screening`, `melt-sequence`
- `hi.phase-diagram` — `axes`, `early-universe`, `crossover`, `nuclear-matter`, `liquid-gas`, `neutron-star`, `unknown-region`, `first-order`, `critical-point`, `energy-scan`, `freezeout-curve`, `experiments`
- `hi.bes-signals` — `fluctuations`, `directed-flow`, `turn-off`, `dileptons`
- `hi.geometry` — `collider`, `fixed-target`
- `hi.walkthrough-collider` — `birth`, `pixels`, `curvature`, `tpc-drift`, `tof`, `identity`
- `hi.walkthrough-fixed-target` — `cone`, `silicon-stations`, `free-streaming`
- `hi.event-replay` — `collider-high`, `fixed-target-low`
- `hi.pid` — dE/dx 밴드

## 위젯
- `CollisionEnergy` (에너지 → 팬케이크 두께, 통과 vs 멈춤)
- `ImpactParameter` (b → 겹침 모양, N_part)
- `FlowDemo` (이심률 → v₂)
- `EnergyScan` (√s_NN → 상태도 위 경로·동결 지점, 실험별 영역)

## 대표 수치 (`src/data/`, 자릿수 수준)
- QGP 온도: ~10¹² K (상전이 온도 ~150 MeV ≈ 2 × 10¹² K, 고에너지 초기 온도는 그 몇 배)
- 원자핵 지름: ~10 fm (납 ~14 fm), LHC 의 로렌츠 인자 γ: 수천
- QGP 수명: ~10 fm/c ≈ 10⁻²³ s
- 충돌 에너지 범위: √s_NN 수 GeV (FAIR, BES 고정 표적) ~ 수천 GeV (LHC)
- 동결 시 바리온 화학 퍼텐셜: LHC ≈ 0 → 가장 낮은 BES 에너지 수백 MeV
- 보통 핵물질 밀도: ~0.16 핵자/fm³; 핵 액체–기체 임계 온도 ~10 MeV 대
- 하전 입자 수: 고에너지 중심 충돌 수천 개, 저에너지 수백 개
- CBM 충돌 빈도: 최대 ~10⁷ /s
- η/s 하한: 1/4π

## 그래프 (모두 개략도)
- QCD 상태도: 영역, crossover 선, 1차 상전이 선(점선, 가설), 임계점(물음표), 동결 곡선, 실험별 영역 띠
- v₂ vs p_T: 증가 후 포화하는 개형
- R_AA vs p_T: 1 아래로 억제된 하드론 vs 1 근처의 광자·Z
- 양성자 수 요동 vs √s_NN: "임계점이 있다면 이런 모양일 것" 이라는 기대 개형 + "측정은 진행 중" 표시
- 방향 흐름 기울기 vs √s_NN: 부호가 바뀌는 개형
- dE/dx vs p: 입자별 밴드 (Bethe–Bloch 공식으로 계산)

## 참고 자료
작성 근거 (저자용, 개념 확인)
- ALICE Collaboration, "The ALICE experiment — A journey through QCD", Eur. Phys. J. C 84, 813 (2024)
- Busza, Rajagopal & van der Schee, "Heavy Ion Collisions: The Big Picture and the Big Questions", Ann. Rev. Nucl. Part. Sci. 68 (2018) 339
- Bzdak et al., "Mapping the phases of quantum chromodynamics with beam energy scan", Phys. Rep. 853 (2020) 1
- CBM Collaboration, "Challenges in QCD matter physics — The scientific programme of the CBM experiment at FAIR", Eur. Phys. J. A 53 (2017) 60
- STAR BES-II 최신 결과 (양성자 수 요동) — 집필 시점에 확인

더 읽을거리 (독자용, 학부 수준 — 최종 선정 필요)
- Busza 외 (2018) 리뷰의 앞부분
- 핵·입자물리 입문 교재의 QCD 장
- ALICE · STAR · FAIR/CBM 의 대중용 소개 페이지

## 연계 (PLAN §2.5)
- **삽입하는 Primer**: `standard-model` (`why`), `magnetic-tracking` · `tpc` · `particle-id` · `silicon-sensor` (`detection`)
- **이 페이지가 원본인 Primer**: `quarks-gluons` (`why` 층의 요약)
- **Bridge (나가는 연결)**
  - `detection` (ITS, CBM MVD/STS) → Semiconductor `#case-its3`
  - `detection` (입자 식별) → Detectors `#interactions` (Bethe–Bloch)
  - `why` (초기 우주) → Dark Matter `#evidence` (CMB · 구조 형성)
- **공유 장면 · 위젯**: `shared.tpc`, `shared.magnetic-track`, `BetheBloch` (PID 밴드 모드) — 앰버 테마
- **Related Topics**: Semiconductor Detectors, Detectors
- **자기 완결 체크**: `phase-diagram` 층이 학부생에게 열역학 상태도(물의 상태도) 지식만으로 이해되는가? `detection` 층이 Primer 만으로 이해되는가?
