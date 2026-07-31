# Power TBM 공식 홍보 홈페이지

Power TBM 앱을 소개하기 위한 반응형 정적 웹사이트입니다. 별도의 빌드 과정이나 유료 서비스 없이 HTML·CSS·JavaScript만으로 실행됩니다.

## 바로 보기

`index.html`을 브라우저로 열면 됩니다. 영상 자동재생이나 일부 브라우저 보안 정책을 포함해 실제 배포 환경과 똑같이 확인하려면 간단한 로컬 서버를 권장합니다.

```bash
python3 -m http.server 8000
```

그다음 브라우저에서 `http://localhost:8000`을 엽니다.

## Vercel 배포

1. 이 폴더 전체를 새 GitHub 저장소에 업로드합니다.
2. Vercel에서 해당 저장소를 가져옵니다.
3. Framework Preset은 `Other`, Build Command는 비워 두고 배포합니다.
4. 자체 도메인이 있으면 Vercel의 Domains 메뉴에서 연결합니다.

## 홈페이지 구성

처음 방문한 사용자가 기능과 순서를 함께 이해할 수 있도록 다음 흐름으로 구성했습니다.

1. Power TBM의 목적과 핵심 가치
2. 처음 사용하는 사람을 위한 6단계 사용법
3. 업무 목적별 핵심 기능
4. TBM 회의록의 4개 작성 구간
5. 실제 앱 화면 12종을 이용한 기능 안내
6. AI·작업중지권·위치정보·기록 관리 원칙
7. 자주 묻는 질문과 앱 실행 안내

## 실제 앱 화면으로 교체하기

실제 화면 안내는 `assets/screens/guide/`의 WebP 이미지를 사용합니다. 최신 캡처로 바꿀 때는 파일명을 유지한 채 해당 이미지를 교체하고, 화면 내용이 달라졌다면 `app.js`의 `guideData` 설명도 함께 수정합니다.

- `home.webp`, `home-alert.webp` — 홈과 기상특보
- `meeting-menu.webp`, `trade-select.webp` — 회의록 메뉴와 공종 선택
- `weather-now.webp`, `weather-week.webp` — 현재·주간 날씨
- `incidents.webp` — 최근 안전사고 사례
- `voice-memo.webp`, `notices.webp`, `contacts.webp` — 현장도구
- `settings.webp`, `location-consent.webp` — 설정과 위치정보 동의
- `checklist-original.webp` — 작업안전 체크리스트 원문 예시

화면은 원본 비율을 유지해 표시하므로 임의로 자르지 않는 것이 좋습니다. 새 이미지는 웹 성능을 위해 메타데이터를 제거한 WebP 형식을 권장합니다.

## 앱 주소 변경

`index.html`에서 다음 주소를 검색해 새 주소로 일괄 교체합니다.

```text
https://power-tbm.vercel.app/
```

QR코드도 바뀐 주소에 맞게 다시 생성해야 합니다.

## 주요 파일

- `index.html` — 사이트 구조와 소개 문구
- `styles.css` — 전체 디자인과 반응형 레이아웃
- `app.js` — 스크롤 효과, 화면 갤러리, 모바일 메뉴, 영상 제어
- `assets/video/` — 인트로 영상 및 포스터
- `assets/screens/guide/` — 기능별 실제 앱 화면 이미지
- `assets/brand/` — 로고, 앱 아이콘, QR코드

## 운영 참고

- 외부 JavaScript 라이브러리와 외부 폰트를 사용하지 않아 유지관리와 사내망 검토가 단순합니다.
- 화면 크기와 사용자 설정에 따라 애니메이션을 자동 축소하며, `prefers-reduced-motion` 접근성 설정을 지원합니다.
- 본 페이지는 Power TBM 프로젝트 소개용입니다. 한국전력공사의 공식 서비스로 오인될 수 있는 표현이나 별도 승인 없는 공식 로고 사용 범위는 실제 공개 전에 내부 기준을 확인해 주세요.

## 운영 점검

- 앱 주소와 QR코드가 같은 목적지인지 확인합니다.
- 실제 화면 이미지가 잘리지 않고 원본 비율로 표시되는지 모바일·PC에서 확인합니다.
- 화면 안내를 추가하거나 순서를 바꾸면 `index.html`의 탭과 `app.js`의 `guideData` 순서를 동일하게 유지합니다.
- 기능 변경 시 사용방법, 자주 묻는 질문, 이용 원칙의 설명도 함께 갱신합니다.
