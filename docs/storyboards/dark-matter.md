# Dark Matter — 암흑물질과 그 검출

- 경로: `/{lang}/dark-matter/`
- 장면 디렉터리: `src/scenes/dark-matter/`
- 스케일 여정: 우주 거대구조 (10²⁶ m) → 은하 → 지하 실험실 → 제논 원자핵 하나의 되튐 (10⁻¹⁵ m)
- 액센트: 보라–인디고
- 핵심 메시지: **"우주를 붙잡고 있는 것은 우리가 볼 수 없는 무언가다. 우리는 그것이 원자핵 하나를 툭 치는 순간을 기다린다."**

## 층별 구성
층 6개: `hook` (T0) → `evidence` (T1) → `candidates` (T2) → `search` (T2) → `direct-detection` (T3) → `frontier` (T4)

### 1. Hook — `hook` · T0
- 비주얼: 은하 사진이 보이다가, 중력 질량 분포가 오버레이되며 보이는 물질보다 훨씬 큰 헤일로가 드러남 (P1)
- 숫자 (P4): 물질의 **~85%** 는 보이지 않는다 (우주 에너지 구성: 보통 물질 ~5%, 암흑물질 ~27%, 암흑에너지 ~68%)

### 2. 왜 있다고 믿는가 (증거) — `evidence` · T1
Sticky + Steps (P2). 각 증거는 독립된 스텝, 하나의 비유.
1. **은하단의 속도** — Zwicky (1933), Coma 은하단: 은하들이 너무 빠르다
2. **은하 회전 곡선** — Rubin & Ford (1970s): 바깥 별들이 예상보다 빠르게 돈다 → 위젯(P5): "보이는 물질만" vs "헤일로 추가" 회전 곡선 비교 슬라이더
3. **중력 렌즈** — 빛이 휘는 정도로 질량을 잰다
4. **Bullet Cluster** — 충돌한 은하단에서 가스(X선)와 질량(렌즈)이 분리됨 → 수정 중력 이론에 대한 강력한 반론
5. **CMB 음향 피크와 구조 형성** — 암흑물질 없이는 지금의 은하가 자랄 시간이 부족
- Deeper: 회전 속도 v(r) = √(GM(r)/r), 평평한 곡선 → M(r) ∝ r

### 3. 무엇일 수 있는가 (후보) — `candidates` · T2
- Primer `standard-model` (무엇이 "보통 물질" 인가), `weak-interaction` (WIMP 의 W)
Horizontal Gallery (P6): 질량 스케일 축 위에 후보를 배치 (10⁻²² eV ~ 태양질량, 약 90자릿수!)
- 초경량: Fuzzy DM, **액시온** (강한 CP 문제의 해결책이기도)
- **WIMP** (GeV–TeV, "WIMP miracle")
- 비활성(sterile) 중성미자
- 원시 블랙홀
- (대안 관점) 수정 중력 — 공정하게 언급하되 증거와의 긴장 설명
- 공통 메시지: "중력으로는 확실히 있다. 다른 힘으로는 아직 아무도 보지 못했다."

### 4. 어떻게 찾는가 (세 갈래) — `search` · T2
도식(P2): 암흑물질 χ 와 표준모형 입자 SM 사이의 하나의 상호작용 다이어그램을 세 방향으로 읽기
- **직접 검출** (χ + 핵 → χ + 핵 되튐): 시간 방향 ↓ 
- **간접 검출** (χχ → SM SM 소멸): 시간 방향 →
- **충돌기 생성** (SM SM → χχ, 누락 에너지): 시간 방향 ←

### 5. 직접 검출 — `direct-detection` · T3
이 페이지의 중심, P1 핀 고정. Primer `scintillation`, `tpc` 삽입.
- **지구는 암흑물질 바람 속을 달린다**: 국소 밀도 ~0.3–0.4 GeV/cm³, 태양계 속도 ~230 km/s
- **Detection Walkthrough (P9) — 이중상 액체 제논 TPC** (대표: XENONnT · 같은 원리: LZ, PandaX)
  - ① 무엇을: 암흑물질 입자가 제논 원자핵 하나를 툭 쳐서 생기는 아주 작은 되튐
  - ② 신호가 생기기까지 (원통 단면도, 아래쪽 액체 · 위쪽 얇은 기체층, 위아래에 광센서 배열)
    1. 되튐 원자핵이 주변 제논을 들뜨게 함 → 즉시 작은 빛 **S1**
    2. 동시에 떨어져 나온 전자들이 전기장을 따라 위로 천천히 표류
    3. 전자들이 기체층으로 끌려 나오며 강한 전기장 속에서 두 번째 빛 **S2**
    4. 위쪽 광센서에 찍힌 S2 의 위치 → 가로 위치, S1 과 S2 사이 시간 → 깊이 ⇒ **3D 위치**
  - ③ 읽어내는 것: 위치 (가장자리 사건은 버림 — 제논 자신이 방패), 에너지, 되튐의 종류
  - ④ 핵심 트릭: **S2/S1 비율** — 원자핵 되튐(신호 후보)과 전자 되튐(배경)은 빛과 전하를 나누는 비율이 다르다
    - 위젯(P5): S2/S1 평면에서 두 띠 — 사용자가 사건을 떨어뜨려 분류해 보기
- **다른 직접 검출 기술 — 원리 카드** (각 카드 = 작은 원리도 하나 + 두세 문장)
  - 액체 아르곤: 빛이 꺼지는 속도(펄스 모양)로 배경을 거름 (DarkSide-20k)
  - 결정 섬광체 NaI: 지구 공전에 따른 "암흑물질 바람" 의 계절 변화를 찾음 — DAMA 의 주장을 같은 물질로 검증 (COSINE-100)
  - 극저온 볼로미터: 아주 차가운 결정에서 되튐이 만든 미세한 온도 상승을 잼 (CRESST, SuperCDMS)
  - 실리콘 CCD: 전자 하나까지 세어 아주 가벼운 암흑물질을 찾음 (SENSEI, DAMIC) → Bridge: Semiconductor

### 6. 최전선 — `frontier` · T4
- **배경과의 싸움** (Primer `underground-lab` 의 원본 내용): 우주선 뮤온 → 지하 1–2 km, 자연 방사능 → 극저 방사능 재료, 자기 차폐(fiducial volume), 물 체렌코프 뮤온 거부
- **배제 곡선** (P8): σ_SI vs m_χ 플롯이 수십 년간 내려온 역사 애니메이션 + **neutrino fog** (태양/대기 중성미자의 CEvNS 가 바닥) → Bridge: Neutrinos
- **액시온을 잡는 원리** (P9 축약판): 강한 자기장 속 금속 공동(cavity) 에서 액시온이 아주 약한 마이크로파 광자로 바뀐다 → 공동의 공명 주파수를 **라디오 채널 돌리듯** 조금씩 바꿔 가며 "소리" 를 찾는다 (대표: ADMX · 한국 IBS 의 액시온 실험)
- 간접 검출의 원리 한 장: 암흑물질이 많은 곳(은하 중심)에서 소멸 → 감마선·반물질 → 위성이 하늘의 "초과분" 을 찾음. "흥미로운 초과 신호가 있었지만 아직 결정적이지 않다" 수준으로
- 지하 실험실 (부록 성격의 작은 지도): 🇮🇹 LNGS (Gran Sasso), 🇰🇷 예미랩 (Yemilab), 그 외 몇 곳 — 위치와 깊이만
- 미해결: 신호 없음이 의미하는 것, 차세대 (XLZD, DARWIN) 계획

## 장면 / 상태
- `dm.halo` — `galaxy-visible`, `halo-reveal`, `rotation-curve`
- `dm.evidence` — `coma`, `rotation`, `lensing`, `bullet`, `cmb`
- `dm.candidates` — 질량 축 갤러리
- `dm.channels` — `direct`, `indirect`, `collider`
- `dm.xenon-tpc` (P9) — `exterior`, `cutaway`, `recoil`, `s1`, `drift`, `s2`, `reconstruct`, `s2-s1-ratio`
- `dm.technique-cards` — `argon-psd`, `nai-modulation`, `bolometer`, `ccd`
- `dm.axion-cavity` — `magnet`, `conversion`, `tuning`
- `dm.exclusion` — 시대별로 내려가는 개략 곡선, `neutrino-fog`

## 위젯
- `RotationCurve` — 원반/헤일로 질량 슬라이더
- `ErNrClassifier` — S2/S1 밴드 분류

## 대표 수치 (`src/data/`, 자릿수 수준)
- 우주 구성: 보통 물질 ~5 %, 암흑물질 ~27 %, 암흑에너지 ~68 %
- 국소 암흑물질 밀도: ~0.3 GeV/cm³ (양성자 몇 분의 일 개 / cm³ 정도)
- 태양계의 은하 공전 속도: ~200 km/s 대
- 액체 제논 검출기 질량: 수 톤 (차세대 수십 톤)
- 지하 실험실 깊이: 1–2 km

## 그래프 (모두 개략도)
- 회전 곡선: 원반(케플러식 감소) + 헤일로(평평) 모형 함수
- 배제 곡선: 질량 축에 대한 U자형 곡선이 시대별로 아래로 내려가는 개형 + 바닥의 neutrino fog 띠
- S2/S1 산점도: ER/NR 두 띠의 개형

## 참고 자료
작성 근거 (저자용, 개념 확인)
- PDG Review: "Dark Matter"
- Clowe et al., ApJ 648, L109 (2006) — Bullet Cluster
- Rubin, Ford & Thonnard, ApJ 238, 471 (1980) — 회전 곡선

더 읽을거리 (독자용, 학부 수준 — 최종 선정 필요)
- 우주론 입문 교재의 암흑물질 장 (예: B. Ryden, *Introduction to Cosmology*)
- 각 실험(XENON, LZ, COSINE) 의 공식 교육·홍보 페이지

## 연계 (PLAN §2.5)
- **삽입하는 Primer**: `standard-model` · `weak-interaction` (`candidates`), `scintillation` · `tpc` (`direct-detection`)
- **이 페이지가 원본인 Primer**: `underground-lab` (`frontier` 의 배경 제거 부분 요약)
- **Bridge (나가는 연결)**
  - `direct-detection` (CCD) → Semiconductor `#zoo`
  - `direct-detection` (제논 TPC) → Detectors `#measurement` (신호 변환)
  - `frontier` (neutrino fog) → Neutrinos `#detection` (CEvNS)
- **공유 장면 · 위젯**: `shared.tpc` (이중상 제논 버전) — 보라 테마
- **Related Topics**: Neutrinos, Semiconductor Detectors
- **자기 완결 체크**: S1·S2 설명이 `scintillation` · `tpc` Primer 만으로 이해되는가?
