# 이전 TV 영상 보관 및 복원

2026-10-22에 현재 재생에서 사용하지 않는 아래 TV 폴더만 `main`에서 정리했습니다.
현재 재생 코드, 음성, 자막, 캐시 버전은 변경하지 않았습니다.

## 보관 위치

- 브랜치: [`archive/tv-assets-before-cleanup-20261022`](https://github.com/plucky775-oss/power-tbm_preview/tree/archive/tv-assets-before-cleanup-20261022)
- 정리 전 커밋: `d9d1ad2397682d08f3e704205f94659b004f0f18`
- 이 브랜치는 정리 직전 전체 프로젝트를 보관합니다. 복구가 필요할 수 있으므로 삭제하지 않습니다.
- 과거 Git 이력은 그대로입니다. 이번 작업은 현재 배포 대상의 파일 수와 용량을 줄이며 저장소 전체 이력의 용량을 줄이지 않습니다.

| 보관한 폴더 | 파일 수 | 바이트 |
| --- | ---: | ---: |
| `assets/tv-en-v119` | 2 | 11,315,288 |
| `assets/tv-en-v126` | 1 | 11,304,861 |
| `assets/tv-en-v127` | 1 | 11,304,846 |
| `assets/tv-ko-v128` | 1 | 11,505,443 |
| `assets/tv-ko-v129` | 1 | 11,505,760 |
| `assets/tv-v99` | 9 | 6,393,622 |
| `assets/tv-v104` | 2 | 11,807,504 |
| `assets/tv-v112` | 2 | 10,781,969 |
| `assets/tv-v118` | 3 | 10,785,460 |
| `assets/tv-v126` | 1 | 10,189,730 |
| 합계 | 23 | 106,894,483 |

## 현재 재생에 필요한 폴더

- `assets/tv-ko-v132`: 한국어 연속 시연 영상
- `assets/tv-en-v128`: 영어 연속 시연 영상
- `assets/tv-v100/images`: TV용 경량 이미지. 번호가 낮아도 현재 `tv-compat.js`와 `sw.js`에서 사용합니다.

그 밖의 `audio`, `background`, `brand`, `screens`, `safety4cut`, `video` 등은 이번 정리 대상이 아닙니다.

## 미디어 재제작 또는 원본 비교 검사

`scripts/build-*.py`와 미디어 원본을 비교하는 Python 검사는 과거 영상이 필요할 수 있습니다.
앱 실행 및 일반 재생·캐시 검사는 복원 없이 실행할 수 있습니다.
다음 명령을 프로젝트 루트에서 실행하면 보관한 파일만 작업 폴더에 복원됩니다.
인덱스와 현재 앱 코드는 변경하지 않습니다. 같은 경로에 직접 수정한 원본이 있다면 먼저 별도로 보관하세요.

```sh
git fetch origin archive/tv-assets-before-cleanup-20261022
git restore --source=d9d1ad2397682d08f3e704205f94659b004f0f18 --worktree -- \
  assets/tv-en-v119 assets/tv-en-v126 assets/tv-en-v127 \
  assets/tv-ko-v128 assets/tv-ko-v129 \
  assets/tv-v99 assets/tv-v104 assets/tv-v112 assets/tv-v118 assets/tv-v126
```

복원한 이전 TV 폴더는 `.gitignore`에서 제외되므로 일반 `git add`로 다시 업로드되지 않습니다.
기존 제작 스크립트는 현재 앱 파일도 다시 쓸 수 있으므로 재제작 작업은 별도 작업 브랜치에서 진행하세요.

특히 다음 검사는 복원 후 실행합니다. 검사 내용을 제거하거나 기준을 완화하지 않았습니다.

```sh
python3 tests/verify-weather-daily.py
python3 tests/verify-weather-ending.py
python3 tests/verify-tv-media.py
python3 tests/verify-english-media.py
python3 tests/verify-balanced-playback.py
```

현재 재생·오프라인 검사는 복원 없이 실행합니다.

```sh
node tests/tv-playback.test.cjs
node tests/verify-pwa.mjs
```
