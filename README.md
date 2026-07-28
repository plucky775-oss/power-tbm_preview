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

## 실제 앱 화면으로 교체하기

현재 화면은 Power TBM 126번 소스의 디자인·기능·이미지 자산을 바탕으로 제작한 고해상도 홍보용 화면입니다. 최신 실제 캡처로 바꾸려면 파일명과 크기 비율을 유지한 채 아래 파일만 덮어쓰면 됩니다.

- `assets/screens/home.png` — 홈
- `assets/screens/meeting.png` — 회의 진행
- `assets/screens/ai.png` — AI 상세검토
- `assets/screens/sign.png` — 서명/PDF
- `assets/screens/calendar.png` — 회의록 캘린더

권장 비율은 스마트폰 화면과 같은 `390:844`이며, 현재 파일은 고해상도 `780×1688`입니다.

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
- `assets/screens/` — 앱 화면 이미지
- `assets/brand/` — 로고, 앱 아이콘, QR코드

## 운영 참고

- 외부 JavaScript 라이브러리와 외부 폰트를 사용하지 않아 유지관리와 사내망 검토가 단순합니다.
- 화면 크기와 사용자 설정에 따라 애니메이션을 자동 축소하며, `prefers-reduced-motion` 접근성 설정을 지원합니다.
- 본 페이지는 Power TBM 프로젝트 소개용입니다. 한국전력공사의 공식 서비스로 오인될 수 있는 표현이나 별도 승인 없는 공식 로고 사용 범위는 실제 공개 전에 내부 기준을 확인해 주세요.

## 실제 앱 스크린샷

홈페이지의 기기 화면은 `assets/screens/`의 실제 Power TBM 스크린샷을 사용합니다.
동일한 파일명(`home.png`, `meeting.png`, `ai.png`, `sign.png`, `calendar.png`)으로 교체하면 사이트 전체에 자동 반영됩니다. 권장 비율은 iPad 세로형 3:4입니다.
