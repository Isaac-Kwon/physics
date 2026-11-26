# Semiconductor Detectors — 반도체 검출기의 원리와 연구 방법

- 경로: `/{lang}/semiconductor-detectors/`
- 장면 디렉터리: `src/scenes/semiconductor-detectors/`
- 스케일 여정: 검출기 배럴 (m) → 모듈 → 센서 칩 (cm) → 픽셀 (~30 μm) → 결정 격자 속 전자–정공 쌍 (nm)
- 액센트: 실리콘 그린–틸 + 구리
- 핵심 메시지: **"당신 휴대폰 카메라 속 실리콘이, 입자물리의 가장 정밀한 눈이 되기까지."**
- 특기: 이 페이지는 연구 방법 층(`research`, `case-its3`)을 가장 두텁게 한다 — "검출기 연구는 실제로 어떻게 이루어지는가" 를 학부생 눈높이에서 보여준다. 대학원 진학을 고민하는 학부생에게 연구실 생활을 미리 보여주는 느낌. 각 단계는 "무엇을, 왜 하는가" 위주로, 기술적 세부는 생략.

## 층별 구성
층 6개: `hook` (T0) → `intuition` (T1) → `mechanism` (T2) → `zoo` (T3) → `research` (T4) → `case-its3` (T4)

### 1. Hook — `hook` · T0
- 비주얼: 웨이퍼 한 장이 회전하며 빛을 반사 → 줌아웃하면 수천 개의 칩이 원통형 검출기 배럴로 조립 (P1, Apple 제품 공개 스타일)
- 숫자 (P4): ALICE ITS2 — **100억 개 이상의 픽셀**, **약 10 m²** 의 실리콘 (픽셀 한 변 ~30 μm, 머리카락 굵기의 절반 이하)

### 2. 빛과 입자를 전기로 — `intuition` · T1
- Primer `ionization` (입자가 지나가며 전하를 남기는 이유)
- 비유: 실리콘은 "전자가 겨우 앉아 있는 계단" — 조금만 툭 쳐도 전자가 위층으로 올라가고 빈자리(정공)가 남는다
- 사진 한 장(카메라) vs 입자 하나(검출기): 같은 원리, 다른 문제 — 광자 수천 개 vs 입자 하나가 남긴 전하 수만 개
- 입자가 300 μm 실리콘을 지나면 약 **2만 개 이상의 전자–정공 쌍** (MIP, 최빈값)

### 3. 메커니즘 — `mechanism` · T2
P2 sticky, 장면: 실리콘 단면 2D/3D (`shared.silicon-cross-section`). 이 층의 요약이 Primer `silicon-sensor` 의 원본.
1. **밴드 구조**: 밴드갭 1.12 eV, 하지만 쌍 하나 만드는 평균 에너지 **3.6 eV** (나머지는 격자 진동) → 기체(~30 eV) 대비 신호가 ~10배
2. **도핑**: n형 (인 P), p형 (붕소 B)
3. **p–n 접합과 공핍층**: 자유 전하가 없는 영역 = 검출 부피
   - 위젯(P5): **역바이어스 전압 슬라이더** → 공핍층 깊이 d ≈ √(2εμρV) 성장, 완전 공핍 전압, 누설 전류
4. **드리프트**: 전기장 속 전자는 빠르게, 정공은 느리게 → ns 수준의 수집
5. **신호 유도 (Shockley–Ramo)**: 전하가 전극에 *도착할 때* 가 아니라 *움직이는 동안* 신호가 생긴다 → 가중 전기장 시각화
6. **확산과 전하 공유**: 이웃 픽셀로 퍼지는 구름 → 무게중심으로 픽셀 크기보다 좋은 위치 분해능. 이진 판독이면 σ ≈ pitch/√12
- Deeper: 이동도, 포화 속도, Lorentz 각 (자기장 속 드리프트)

### 4. 반도체 검출기 동물원 — `zoo` · T3
P6 가로 갤러리 → 각 카드를 열면 **단면 원리도 위에서 입자(또는 광자) 하나가 신호가 되는 과정** 을 3–4 단계로 보여준다 (P9 축약판). 카드마다 "무엇이 다른가" 를 한 가지 트릭으로 요약 (예: MAPS = 센서와 회로가 한 몸, LGAD = 내부 증폭층으로 신호를 키워 시간을 정밀하게).
| 종류 | 핵심 | 대표 사용처 |
|---|---|---|
| **스트립 검출기** | 긴 띠 전극, 1D 위치, 넓은 면적 경제적 | ATLAS/CMS 외곽 트래커 |
| **하이브리드 픽셀** | 센서와 판독 칩을 범프 본딩으로 결합 | ATLAS/CMS 픽셀, Timepix (의료·우주에도) |
| **MAPS (모놀리식)** | 센서와 회로가 한 칩에, CMOS 이미지 센서 공정 활용, 얇고 저렴 | **ALICE ITS2 (ALPIDE)**, ITS3, 미래 충돌기 |
| **LGAD** | 내부 이득층 → ~30 ps 타이밍 | HL-LHC 타이밍 검출기 (ATLAS HGTD, CMS ETL) |
| **3D 센서** | 전극이 벌크를 관통 → 짧은 수집 거리, 방사선 내성 | ATLAS IBL 일부 |
| **HPGe** | 고순도 게르마늄, 최고의 에너지 분해능 (γ 분광) | 핵분광, 0νββ (LEGEND) → Bridge: Neutrinos |
| **CCD (skipper)** | 단일 전자 계수 | 암흑물질 SENSEI, DAMIC → Bridge: Dark Matter |
| **SiPM** | 가이거 모드 APD 배열, 단일 광자 | 섬광체 판독, PET |
| 넓은 밴드갭 (다이아몬드, SiC, GaN) | 방사선·고온 내성 | 빔 모니터 |

### 5. 연구 방법 (실제 연구자의 하루) — `research` · T4
P2 sticky, "센서 하나가 태어나서 검출기에 들어가기까지" 의 파이프라인.
1. **설계 & 시뮬레이션**
   - TCAD (소자 시뮬레이션: 전기장, 공핍, 방사선 손상 모델)
   - 몬테카를로: Geant4 + **Allpix²** (센서 응답 전체 체인)
   - **판독 회로 설계**: 작은 전하를 증폭 → 모양 다듬기 → 문턱과 비교해 "맞았다/안 맞았다" 판단. 노이즈·문턱·전력 사이의 줄다리기
2. **팹 & 웨이퍼 검증**: 프로브 스테이션 **I–V / C–V** 측정 → 항복 전압, 완전 공핍 전압
3. **실험실 특성 평가**
   - 방사선원: ⁹⁰Sr (β, MIP 근사), ⁵⁵Fe (5.9 keV X선, 이득 보정)
   - **TCT / TPA-TCT 레이저 스캔**: 센서 내부 깊이별 전하 수집 지도
   - 문턱/노이즈 스캔 (S-curve)
4. **테스트빔**: DESY, CERN SPS 등에서 **빔 망원경** (기준 평면들) 사이에 DUT 를 놓고 효율, 위치 분해능, 클러스터 크기 측정 (EUDAQ, Corryvreckan)
   - 위젯(P5): 망원경 평면을 지나는 궤적 → 잔차(residual) 분포가 쌓이는 히스토그램
5. **방사선 손상**: 중성자/양성자 조사 (1 MeV n_eq/cm² 단위), 결함 → 누설 전류 증가, 유효 도핑 변화, 전하 포획 → 어닐링
6. **시스템 통합**: 모듈 조립, 와이어 본딩, 냉각, 저물질 구조, 판독 시스템

### 6. 사례 연구와 미래 — `case-its3` · T4
- **ALICE ITS2 → ITS3**
  - ITS2: 7층 MAPS, 2021~ 가동
  - ITS3: 최내층 3개를 **휘어진 웨이퍼 스케일 MAPS** (65 nm CMOS, 두께 수십 μm) 로 교체 — 원통으로 구부린 실리콘, 층당 물질량 ~0.07 % X₀. LS3 (2026~) 설치 예정
  - 시각화: 평평한 웨이퍼가 종이처럼 휘어 원통이 되는 애니메이션 (이 페이지의 클라이맥스 후보)
- 다른 예: **CBM (FAIR)** 의 MAPS 꼭짓점 검출기(MVD)와 실리콘 트래커(STS) — 초당 수백만 번의 충돌을 견디는 실리콘
- 미래: 4D 트래킹, ALICE 3, FCC-ee 버텍스 검출기, 우주·의료 응용

## 장면 / 상태
- `si.wafer-to-barrel` — `wafer`, `chips`, `staves`, `barrel`
- `si.cross-section` — `bands`, `doping`, `junction`, `depletion`, `mip-crossing`, `drift`, `induction`, `diffusion`
- `si.zoo` — 종류별 카드
- `si.lab-pipeline` — `tcad`, `asic`, `probe`, `source`, `tct`, `testbeam`, `irradiation`, `integration`
- `si.its3-bending`

## 위젯
- `BiasDepletion` · `ChargeSharing` (입사 위치 → 픽셀별 전하) · `TestbeamResiduals`

## 대표 수치 (`src/data/`, 자릿수 수준)
- 실리콘 밴드갭 ~1.1 eV, 전자–정공 쌍 하나당 ~3.6 eV (기체는 ~30 eV)
- MIP 가 만드는 전하: ~80 쌍/μm → 300 μm 센서에서 수만 개
- 픽셀 크기: 수십 μm, 센서 두께: 수십 ~ 수백 μm
- 전하 수집 시간: ~ns
- ALICE ITS2: ~10 m², 픽셀 ~10¹⁰ 개 (100억 개 이상)
- 이진 판독 위치 분해능: pitch/√12

## 그래프 (모두 개략도 / 교재 공식으로 계산)
- 바이어스 전압 vs 공핍 깊이: d ∝ √V 후 완전 공핍에서 포화
- 테스트빔 잔차 히스토그램: 가우시안 개형
- I–V 곡선: 완만한 누설 전류 → 항복에서 급상승 개형

## 참고 자료
작성 근거 (저자용, 개념 확인)
- H. Kolanoski & N. Wermes, *Particle Detectors* (반도체 장)
- G. Lutz, *Semiconductor Radiation Detectors*
- ALICE ITS3 TDR (2024) — 휘어진 센서 개념

더 읽을거리 (독자용, 학부 수준 — 최종 선정 필요)
- 고체물리 입문 교재의 반도체 장 (예: C. Kittel, *Introduction to Solid State Physics*)
- H. Spieler, *Semiconductor Detector Systems* (앞부분)
- ALICE ITS 공식 소개 페이지

## 연계 (PLAN §2.5)
- **삽입하는 Primer**: `ionization` (`intuition`), `magnetic-tracking` (`research` 의 테스트빔 망원경 부분)
- **이 페이지가 원본인 Primer**: `silicon-sensor` (`mechanism` 요약)
- **Bridge (나가는 연결)**
  - `intuition` (MIP 전하) → Detectors `#interactions`
  - `zoo` (HPGe) → Neutrinos `#frontier` (0νββ)
  - `zoo` (CCD) → Dark Matter `#direct-detection`
  - `case-its3` (ITS, CBM) → Heavy-Ion `#detection`
- **공유 장면 · 위젯**: `shared.silicon-cross-section` (Heavy-Ion, Detectors 에서는 경량 버전) — 실리콘 그린 테마
- **Related Topics**: Heavy-Ion, Detectors
