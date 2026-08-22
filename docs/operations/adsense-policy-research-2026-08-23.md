# Google AdSense 재심사 대비 공식 정책 조사

최종 조사일: 2026-08-23
대상 사이트: `https://eoringo.pages.dev/`
조사 범위: Google AdSense/Publisher Policies, 콘텐츠·사용자 환경, Search Essentials·품질, ads.txt, 동의·개인정보 관련 Google 공식 문서

> 이 문서는 승인 결과를 보장하는 처방전이 아니다. Google이 공개한 1차 자료의 요구사항과 현재 저장소를 대조해 재심사 전에 확인할 항목을 정리한 조사 기록이다. Google 공식 문서가 아닌 커뮤니티 답변, 대행사 글, 임의의 “필수 글 수/단어 수” 기준은 근거로 사용하지 않았다.

참고로 과거에 안내되던 [minimum content requirements URL](https://support.google.com/adsense/answer/9335564?hl=ko)은 조사일 현재 [Google 게시자 정책](https://support.google.com/adsense/answer/10502938?hl=ko)으로 리디렉션된다. 따라서 이 문서는 해당 과거 링크의 제목을 그대로 재현하지 않고, 현재 도착한 공식 정책과 관련 AdSense 안내를 기준으로 정리했다.

## 1. 핵심 결론

현재 프로젝트의 위험은 공개 가이드의 개수보다 “광고를 어디에 둘 수 있는가”와 “사이트 자체가 방문자에게 충분한 독창적 가치를 지속적으로 제공하는가”에 있다.

가장 안전한 재심사 방향은 다음과 같다.

1. 광고를 개인 기록·체크·달력·설정·로그인 같은 행동 중심 화면과 분리한다. Google은 게시자 콘텐츠가 없거나 가치가 낮은 화면, 미완성 화면, 알림·탐색·행동 목적의 화면에 Google 게재 광고를 허용하지 않는다. [Google 게시자 정책](https://support.google.com/adsense/answer/10502938?hl=ko)
2. 공개 콘텐츠를 단순 기능 설명 모음이 아니라, 에오링고가 실제로 해결하는 문제·판단 기준·사용 결과·데이터 한계·업데이트 이력을 보여 주는 독창적인 편집 영역으로 운영한다. Google은 고유하고 가치 있는 콘텐츠, 재방문할 이유, 정기적인 고유 콘텐츠 업데이트를 요구한다. [Google 애드센스 콘텐츠 및 사용자 환경](https://support.google.com/adsense/answer/10015918?hl=ko)
3. 공개 페이지는 로그인 없이 읽히고, 서로 연결되며, 페이지마다 제목·주제·작성 주체·최종 검토일·출처와 한계가 실제 본문에 나타나야 한다. 구조화 데이터는 보조 신호일 뿐, 보이지 않는 내용을 마크업하거나 검색 노출을 보장하는 수단으로 사용하면 안 된다. [Google Search Essentials](https://developers.google.com/search/docs/essentials?hl=ko), [구조화된 데이터 일반 가이드라인](https://developers.google.com/search/docs/appearance/structured-data/sd-policies?hl=ko)
4. AdSense 코드를 재도입하기 전에 개인정보처리방침에 Google 광고로 인한 쿠키·웹 비콘·IP 주소·기타 식별자 사용과 제3자 처리 사실을 명확히 공개한다. EEA·영국·스위스 사용자를 대상으로 개인 맞춤 광고를 게재한다면 Google 인증 CMP와 IAB TCF 연동 요건을 충족한다. [Google 게시자 정책 - 개인정보 보호 공개](https://support.google.com/adsense/answer/10502938?hl=ko), [Google 쿠키 안내](https://support.google.com/adsense/answer/7549925?hl=ko), [Google CMP 요건](https://support.google.com/adsense/answer/13554020?hl=en-GB)
5. 운영 도메인의 `/ads.txt`를 실제 배포 상태에서 확인하고, AdSense 계정의 게시자 ID와 직접 대조한다. 현재 저장소의 행은 사용자가 제공한 계정 정보와 일치하지만, 저장소 파일의 존재만으로 운영 도메인에서의 크롤링·승인 상태가 확인되는 것은 아니다. [Ads.txt FAQ](https://support.google.com/adsense/answer/9785052?hl=ko)

## 2. 공식 문서에서 확인한 주장과 근거

### 2.1 AdSense 자격·콘텐츠 품질

| 공식 주장 | 재심사에 적용할 해석 | 근거 |
| --- | --- | --- |
| AdSense 콘텐츠는 고품질·독창적이어야 하고 잠재고객을 끌어야 한다. | 기능이 동작한다는 사실만으로는 공개 게시자 콘텐츠의 품질을 증명하지 못한다. | [AdSense 자격 요건](https://support.google.com/adsense/answer/9724?hl=ko) |
| 페이지에는 고유 콘텐츠가 충분해야 Google이 사이트를 파악할 수 있고, 사용자가 방문하고 다시 방문할 이유가 있어야 한다. | 글 수를 채우는 대신 서비스의 고유한 방법론, 실제 사용 맥락, 판단 기준을 공개해야 한다. | [AdSense 콘텐츠 및 사용자 환경](https://support.google.com/adsense/answer/10015918?hl=ko) |
| 사이트는 정기적으로 업데이트하고 새로운 고유 콘텐츠를 꾸준히 추가해야 한다. | 날짜만 바꾸지 말고 실제 변경 내역, 검토 범위, 데이터 변경 이유를 남겨야 한다. | [AdSense 콘텐츠 및 사용자 환경](https://support.google.com/adsense/answer/10015918?hl=ko), [사람 우선 콘텐츠](https://developers.google.com/search/docs/fundamentals/creating-helpful-content?hl=ko) |
| 탐색은 명확하고 사용하기 쉬워야 하며 사용자가 원하는 정보를 쉽게 찾아야 한다. | 공개 콘텐츠의 상단·본문·하단에서 가이드, 개인정보, 이용 안내, 문의로 이동할 수 있어야 한다. | [AdSense 사이트 준비](https://support.google.com/adsense/answer/7299563?hl=ko), [AdSense 승인 거부 사유](https://support.google.com/adsense/answer/81904?hl=ko) |
| Google의 승인 거부 안내는 충분한 텍스트, 완전한 문장과 문단, 완성된 사이트를 권고한다. | 제목만 있는 랜딩 페이지, 빈 상태 화면, 템플릿만 있는 페이지, 로그인해야만 읽을 수 있는 공개 대상 페이지를 제출하지 않는다. | [AdSense 계정이 승인되지 않음](https://support.google.com/adsense/answer/81904?hl=ko) |
| Google은 고정된 선호 단어 수를 제시하지 않는다. | “페이지당 800단어”, “게시물 몇 개” 같은 비공식 수치를 품질 기준으로 사용하지 않는다. 내용이 독자의 목적을 충분히 해결하는지가 기준이다. | [사람 우선 콘텐츠](https://developers.google.com/search/docs/fundamentals/creating-helpful-content?hl=ko) |

### 2.2 게시자 정책과 광고를 둘 수 없는 화면

| 공식 주장 | 현재 프로젝트에서의 통제 원칙 | 근거 |
| --- | --- | --- |
| Google 게재 광고는 게시자 콘텐츠가 없거나 가치가 낮은 화면, 미완성 화면, 알림·탐색·기타 행동 목적 화면에 허용되지 않는다. | `/`, `/tasks`, `/tasks/manage`, `/calendar`, `/settings`, `/auth/*`처럼 개인 상태를 조작하는 앱 화면에는 광고를 넣지 않거나 검색·광고 대상에서 분리한다. | [Google 게시자 정책 - 인벤토리 가치](https://support.google.com/adsense/answer/10502938?hl=ko) |
| 광고가 탐색·작업 항목에 겹치거나 인접해 의도하지 않은 클릭을 만들면 안 된다. 콘텐츠를 가리거나 화면을 밀어내거나 광고를 클릭해야 나갈 수 있는 화면도 금지된다. | 체크박스, 달력 셀, 드롭다운, 로그인·백업·복원 버튼, 모달과 광고를 인접시키지 않는다. 전면 광고·막다른 화면·작업 중 오버레이를 사용하지 않는다. | [Google 게시자 정책 - 광고 방해](https://support.google.com/adsense/answer/10502938?hl=ko) |
| 광고는 연결된 게시자 콘텐츠가 무엇인지 분명해야 하며, 백그라운드·화면 밖·사용자 관심이 다른 화면에 광고를 표시하면 안 된다. | 광고가 들어간다면 공개 편집 콘텐츠의 본문 흐름 안에서만 맥락을 분명히 하고, 개인 작업 상태나 백그라운드 앱 셸에 삽입하지 않는다. | [Google 게시자 정책 - 맥락을 벗어난 광고](https://support.google.com/adsense/answer/10502938?hl=ko) |
| 다른 콘텐츠를 복사·삽입하고 논평·선별·추가 가치를 더하지 않은 화면에는 광고를 둘 수 없다. | 외부 게임 일정·시트·커뮤니티 자료는 그대로 재게시하지 않고, 출처·검토일·해석·한계·원본 링크를 함께 제공한다. | [Google 게시자 정책 - 복제 콘텐츠](https://support.google.com/adsense/answer/10502938?hl=ko) |
| 게시자 콘텐츠보다 광고나 유료 홍보가 많은 화면에는 광고를 둘 수 없다. | 공개 문서의 정보량과 읽기 흐름을 먼저 확보하고 광고 단위를 최소화한다. “광고가 보이는가”보다 “콘텐츠 소비를 방해하는가”를 검토한다. | [Google 게시자 정책 - 광고·유료 홍보 비중](https://support.google.com/adsense/answer/10502938?hl=ko) |
| 게시자는 Google 광고 시스템에 제공하는 정보와 ads.txt 정보를 정확하고 완전하게 선언해야 한다. | 계정 ID, 도메인, 광고 요청 URL, ads.txt의 직접 판매자 관계를 실제 계정·운영 상태와 대조한다. | [Google 게시자 정책 - 부정직한 선언](https://support.google.com/adsense/answer/10502938?hl=ko) |

### 2.3 사람 우선 콘텐츠·Search Essentials·품질

| 공식 주장 | 재심사에 적용할 해석 | 근거 |
| --- | --- | --- |
| Search Essentials는 기술 요구사항, 스팸 정책, 핵심 모범 사례의 세 부분으로 구성된다. 모든 조건을 만족해도 크롤링·색인·검색 노출이 보장되지는 않는다. | Search Console 색인 여부와 AdSense 승인 여부를 같은 것으로 보지 않는다. 기술 SEO는 콘텐츠 품질을 대체하지 않는다. | [Google Search Essentials](https://developers.google.com/search/docs/essentials?hl=ko) |
| Google은 사람에게 유용하고 신뢰할 수 있는 콘텐츠를 우선하며, 원본 정보·분석·완전한 설명·추가 가치를 점검할 것을 권한다. | 에오링고 가이드는 기능 메뉴를 반복하지 말고 “왜 이 루틴 모델을 쓰는지”, “어떤 상황에서 실패하는지”, “사용자가 어떤 결정을 할 수 있는지”를 보여줘야 한다. | [도움이 되고 신뢰할 수 있는 사람 우선 콘텐츠](https://developers.google.com/search/docs/fundamentals/creating-helpful-content?hl=ko) |
| 사이트에는 주된 목적이 있어야 하고, 방문자가 읽은 뒤 목표를 달성할 만큼 배워 만족해야 한다. | 공개 영역의 주제를 파이널판타지14 루틴·일정 판단 도구로 일관되게 유지하고, 관련 없는 검색어용 페이지를 늘리지 않는다. | [사람 우선 콘텐츠](https://developers.google.com/search/docs/fundamentals/creating-helpful-content?hl=ko) |
| 검색 유입만을 목적으로 여러 주제의 콘텐츠를 대량 생산하거나, 다른 사람의 내용을 거의 요약하거나, 자동화를 이용해 검색 조작용 콘텐츠를 만들면 경고 신호다. | AI로 만든 설명을 검수 없이 대량 게시하지 않는다. 모든 공개 문서에는 실제 운영자의 검토와 고유한 사례·판단·한계를 남긴다. | [사람 우선 콘텐츠](https://developers.google.com/search/docs/fundamentals/creating-helpful-content?hl=ko) |
| 사이트 구조, 명확한 URL, 읽기 쉬운 제목·문단·섹션, 고유하고 최신이며 신뢰할 수 있는 콘텐츠, 과도하게 산만한 광고를 피하는 것이 SEO 기본 가이드의 권고다. | 공개 페이지는 하나의 주제와 하나의 대표 URL을 갖고, 중복 URL·얇은 페이지·과도한 광고를 정리한다. | [SEO 기본 가이드](https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=ko) |
| 복제·스크랩·부가 가치가 거의 없는 제휴 페이지·도어웨이 등은 얇은 콘텐츠의 대표 사례이며, 문제 페이지를 찾아 유의미한 가치를 추가해야 한다. | 외부 데이터를 단순 미러링하거나 키워드별 유사 페이지를 만들지 않는다. 공개 페이지를 검토할 때는 “이 페이지를 별도 URL로 유지해야 할 고유한 이유가 있는가?”를 묻는다. | [Search Console 직접 조치 보고서 - 얇은 콘텐츠](https://support.google.com/webmasters/answer/9044175?hl=ko#thin-content) |
| 검색 크롤러가 사용자와 같은 방식으로 중요한 CSS·JavaScript·콘텐츠에 접근할 수 있어야 한다. | SPA 경로를 공개할 때는 실제 사용자와 Google이 같은 본문을 보고, URL 검사로 렌더링 결과와 링크를 확인한다. | [SEO 기본 가이드](https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=ko), [JavaScript SEO 기본사항](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics?hl=ko) |
| 구조화 데이터는 보이는 본문을 정확히 표현해야 하며, 숨겨진·관련 없는·오해를 부르는 내용을 마크업하면 안 된다. 올바르게 작성해도 검색 결과 노출은 보장되지 않는다. | Article/CollectionPage JSON-LD의 제목·작성 주체·날짜·본문이 실제 화면과 일치하는지 점검하고, 검색 노출을 위해 가짜 리뷰나 보이지 않는 내용을 추가하지 않는다. | [구조화된 데이터 일반 가이드라인](https://developers.google.com/search/docs/appearance/structured-data/sd-policies?hl=ko) |

### 2.4 ads.txt

Google 공식 FAQ에 따르면 `ads.txt`는 루트 도메인에 `ads.txt`라는 텍스트 파일로 호스팅하고, 승인된 거래소·SSP마다 한 행을 둔다. Google 판매자 계정의 도메인은 `google.com`이며, 게시자 ID는 `pub-` 접두사와 16자리 숫자를 사용한다. 계정을 직접 관리하는 게시자는 관계 필드에 `DIRECT`를 사용한다. [Ads.txt FAQ](https://support.google.com/adsense/answer/9785052?hl=ko)

현재 저장소에는 다음 행이 있다.

```text
google.com, pub-2169729065542563, DIRECT, f08c47fec0942fa0
```

이는 저장소의 `public/ads.txt`에 있는 값이라는 의미일 뿐이다. 재심사 전에는 다음을 실제 운영 도메인에서 확인해야 한다.

- `https://eoringo.pages.dev/ads.txt`가 로그인·리디렉션 오류 없이 `200`으로 열리는가
- 응답 본문이 저장소의 의도한 행과 정확히 일치하는가
- `pub-2169729065542563`가 현재 AdSense 계정의 Account information에 표시되는 게시자 ID인가
- `DIRECT`가 실제로 게시자가 해당 Google 판매자 계정을 직접 관리하는 관계인가
- Cloudflare Pages 배포 산출물에 파일이 포함되었는가

Google은 루트 도메인의 ads.txt를 사용해 해당 도메인에서 광고를 판매할 수 있는 판매자 계정을 판단하며, ID가 잘못되면 해당 요청에 입찰하지 않는다. 따라서 ads.txt는 콘텐츠 품질을 보완하는 자료가 아니라 광고 인벤토리의 판매자 권한을 정확히 선언하는 운영 조건이다. [Ads.txt FAQ](https://support.google.com/adsense/answer/9785052?hl=ko)

### 2.5 개인정보·쿠키·동의

| 공식 주장 | 현재 프로젝트에 필요한 조치 | 근거 |
| --- | --- | --- |
| Google 광고를 사용하는 게시자는 Google 제품 사용 결과 발생하는 데이터 수집·공유·사용을 기술 정보와 함께 명확히 공개해야 한다. 개인정보처리방침에는 쿠키, 웹 비콘, IP 주소 또는 기타 식별자와 광고로 인해 제3자가 쿠키를 삽입·읽거나 정보를 수집할 수 있다는 사실을 알려야 한다. | 현재 개인정보 안내의 로컬 저장·Google 연결·Supabase 설명과 별도로, AdSense를 추가하는 시점에 Google 광고·쿠키·웹 비콘·IP·제3자 처리·데이터 사용 링크를 실제 구현과 일치하게 명시한다. | [Google 게시자 정책 - 개인정보 보호 공개](https://support.google.com/adsense/answer/10502938?hl=ko) |
| AdSense는 광고·보고·빈도 관리 등에 쿠키를 사용할 수 있고, 광고 태그만 넣어도 광고가 표시되지 않는 상태에서 추적 픽셀 등이 호출될 수 있다. 모든 게시자는 쿠키 사용을 알리는 개인정보처리방침을 명확히 표시해야 한다. | 광고 태그를 먼저 삽입하고 나중에 동의·고지를 맞추지 않는다. 태그 로드 시점, 지역별 동의 상태, 거부 후 비개인 맞춤 광고 또는 광고 미요청 동작을 테스트한다. | [AdSense 쿠키 사용 방식](https://support.google.com/adsense/answer/7549925?hl=ko) |
| EEA·영국·스위스 사용자를 대상으로 개인 맞춤 광고를 게재하려면 Google 인증 CMP와 IAB TCF 연동이 필요하다. 이를 충족하지 않으면 개인 맞춤 광고를 게재할 수 없다. Google의 CMP 인증은 관련 법률 전체 준수를 대신 심사하는 것이 아니다. | 글로벌 접속을 허용하는 현재 사이트에서 개인 맞춤 광고를 사용할 경우, Google 인증 CMP의 현재 인증 상태와 TCF 연동을 확인하고 법률 준수는 별도로 검토한다. | [Google CMP 요건](https://support.google.com/adsense/answer/13554020?hl=en-GB) |
| Google의 EU 사용자 동의 정책은 EEA·영국·스위스에서 법적으로 필요한 경우 쿠키·로컬 저장소 사용에 대한 고지·동의와, 개인 맞춤 광고를 위한 개인정보 수집·공유·사용에 대한 동의를 요구한다. Google CMP·제3자 CMP·자체 동의 대화상자를 사용할 수 있다. | 개인 맞춤 광고를 쓰지 않더라도 지역별 법적 요구와 쿠키·로컬 저장소 사용을 별도로 확인하고, 동의 UI에 실제 선택 가능한 목적·파트너·철회 경로를 반영한다. | [CMP 설정·관리](https://support.google.com/adsense/answer/7670013?hl=ko) |
| 개인정보처리방침은 실제 서비스 동작과 일치해야 하며, Google 제품을 통해 개인 식별 정보를 전달하거나 식별·병합해서는 안 된다. | 루틴·캐릭터·이메일·인증 상태를 광고 개인 최적화용 잠재고객 데이터로 보내지 않는다. Google 연결 범위와 광고 데이터 흐름을 각각 분리해 설명한다. | [Google 게시자 정책 - 사용자 식별·개인정보](https://support.google.com/adsense/answer/10502938?hl=ko) |

## 3. 현재 저장소와 공식 기준의 대조

아래는 2026-08-23 현재 저장소를 읽어 확인한 사실이다. “승인됨”이 아니라 “코드·문서에 그렇게 구현 또는 기록되어 있음”을 뜻한다.

### 확인된 기반

- `public/ads.txt`에 사용자가 제공한 Google 행이 있다.
- `public/robots.txt`와 `public/sitemap.xml`이 있고, 사이트맵에는 공개 가이드·개인정보·서비스 이용 안내 URL만 등록되어 있다.
- `/guide`, `/guide/routine`, `/guide/getting-started`, `/guide/calendar` 공개 경로가 존재하며, 본문에 사용 목적·사용 흐름·데이터 한계·내부 링크가 있다.
- `/privacy`와 `/terms`가 공개 경로로 연결되고 문의 링크도 제공된다.
- 앱 화면의 `noindex,nofollow`와 공개 문서의 `index,follow`를 분리하는 메타데이터 로직이 있다.
- 저장소 검색 결과상 AdSense 광고 태그(`adsbygoogle`, `pagead2`, `googlesyndication`)는 확인되지 않았다. 따라서 현재 저장소 기준으로는 광고 태그를 추가하기 전 단계로 보인다.

### 재심사 전에 증거를 더 만들어야 하는 부분

1. **실제 운영 URL 증거**: 운영 도메인에서 모든 공개 URL, `ads.txt`, `robots.txt`, `sitemap.xml`의 HTTP 응답·본문·리디렉션을 기록한다.
2. **콘텐츠 독창성 증거**: 각 공개 문서마다 실제 운영자가 검토한 사례, 루틴 모델의 설계 이유, 적용 전후의 판단 예시, 실패·예외 조건, 외부 자료와의 차이를 추가한다. 기능 설명과 정책 문구를 다시 쓰는 것만으로는 부족하다.
3. **편집 책임성**: 작성 주체, 문의 경로, 검토일, 변경 이력, 외부 데이터의 원본·갱신 주기·오류 신고 방법을 공개한다. 검토일만 변경해 최신처럼 보이게 하지 말고 내용이 바뀐 경우에만 갱신한다. [사람 우선 콘텐츠](https://developers.google.com/search/docs/fundamentals/creating-helpful-content?hl=ko)
4. **공개 사용성**: 로그아웃·시크릿 창·모바일에서 공개 문서가 로그인 없이 읽히고, 모든 주요 페이지가 깨진 링크 없이 순환되는지 확인한다. Google은 로그인·제한 액세스, 깨진 링크, 과도한 팝업, 미완성 페이지를 탐색 문제의 예로 든다. [AdSense 계정이 승인되지 않음](https://support.google.com/adsense/answer/81904?hl=ko)
5. **광고 전용 안전 구역**: 광고를 추가한다면 먼저 공개 콘텐츠 페이지에만 제한적으로 배치하고, 개인 작업 화면에는 광고 태그 자체를 로드하지 않는 설계를 검토한다.
6. **개인정보·동의 실행 증거**: 광고 태그가 실제로 로드되는 경우에만 개인정보처리방침과 동의 UI를 구현하고, 지역별 동의·거부·철회·비개인 맞춤 광고 동작을 네트워크 로그와 함께 검증한다.

## 4. 우선순위별 운영 권고

### P0 — 재신청 전 반드시 결정할 것

- 광고를 앱 행동 화면에 넣지 않는다. Google 정책상 해당 화면은 광고에 부적합할 가능성이 가장 높다.
- 광고를 넣을 공개 URL과 광고를 넣지 않을 URL을 문서와 코드에서 명시적으로 분리한다.
- 개인정보처리방침을 AdSense 실제 사용 상태에 맞게 확정한다. 광고 태그를 넣기 전에는 쿠키·데이터 흐름·지역별 동의 설계를 확정한다.
- 운영 도메인의 `ads.txt`를 HTTP로 검증하고 AdSense 계정의 게시자 ID·판매자 관계와 대조한다.
- 빈 상태·템플릿·로그인 벽·깨진 링크·오래된 외부 데이터가 공개 페이지에 남아 있지 않은지 확인한다.

### P1 — 승인 가능성을 실질적으로 높이는 콘텐츠 작업

- 공개 영역의 중심을 “앱 기능 안내”에서 “에오링고가 가진 고유한 루틴 설계 관점과 실제 적용 결과”로 이동한다.
- 각 문서에 독자가 해결하려는 구체적 문제, 판단 절차, 예시 입력과 결과, 예외·실패 조건, 마지막에 실행할 행동을 포함한다.
- 외부 자료는 원문 링크만 붙이지 말고, 에오링고의 해석과 추가 가치를 분리해 표시한다. 복사·번역·요약만 제공하는 문서는 광고 대상에서 제외한다.
- 공개 문서에 작성자/운영 주체, 문의 방법, 변경 내역, 데이터 갱신 주기와 한계를 일관되게 표시한다.
- 실제 사용자의 문제를 해결하는 새 문서를 추가하되, 키워드 조합만 바꾼 유사 페이지·도어웨이·자동 대량 생성을 만들지 않는다.

### P2 — 기술·운영 품질 보강

- Search Console URL 검사로 Google이 보는 공개 HTML과 일반 사용자가 보는 화면이 같은지 확인한다.
- 사이트맵 URL이 실제 공개 문서와 일치하고, canonical·robots·JSON-LD가 본문·경로와 모순되지 않는지 확인한다.
- 구조화 데이터는 화면에 보이는 내용만 표현하고 Rich Results Test 결과를 승인 근거로 과장하지 않는다.
- 모바일에서 광고가 콘텐츠를 밀어내거나 작업 요소를 가리지 않는지 확인한다.
- 배포마다 공개 URL, `ads.txt`, 동의 UI, 개인정보 링크, 광고 스크립트 로드 범위를 자동 점검한다.

## 5. 재심사 제출 전 증거 체크리스트

### 콘텐츠·품질

- [ ] 공개 페이지마다 독립적인 주제와 독창적인 결론이 있다.
- [ ] 기능 목록이나 제목만 나열하지 않고 완전한 문장·문단·사례가 있다.
- [ ] 외부 자료를 사용한 곳에는 원본 링크, 사용 범위, 에오링고의 추가 해석, 최신성 한계가 있다.
- [ ] 각 페이지에 작성 주체, 실제 검토일, 변경 이력이 있고 날짜만 갱신하지 않았다.
- [ ] 로그인하지 않은 방문자가 공개 콘텐츠를 처음부터 끝까지 읽을 수 있다.
- [ ] 사이트의 주된 목적이 파이널판타지14 루틴·일정 판단 도구로 일관된다.

### 광고·정책

- [ ] 광고가 개인 체크·달력·설정·로그인·백업·알림 화면에 로드되지 않는다.
- [ ] 광고가 콘텐츠보다 많지 않고, 탐색·작업 요소와 겹치지 않는다.
- [ ] `https://eoringo.pages.dev/ads.txt`가 운영 상태에서 열리고 게시자 ID가 계정과 일치한다.
- [ ] 광고가 필요한 페이지의 본문이 광고 없이도 완성된 공개 콘텐츠다.
- [ ] 광고 코드·판매자 정보·광고 요청 URL이 정확하며 오해의 소지가 없다.

### 개인정보·동의

- [ ] 개인정보처리방침이 Google 광고의 쿠키·웹 비콘·IP·식별자·제3자 처리 사실을 실제 구현과 일치하게 공개한다.
- [ ] EEA·영국·스위스 대상 개인 맞춤 광고를 사용할 경우 Google 인증 CMP와 IAB TCF 연동을 확인했다.
- [ ] 동의 전 광고·쿠키·로컬 저장소 호출 여부와 거부·철회 시 동작을 테스트했다.
- [ ] 루틴·캐릭터·이메일·인증 상태를 광고 개인 최적화용 데이터로 부적절하게 전송하지 않는다.
- [ ] 개인정보처리방침, 서비스 이용 안내, 문의 링크가 공개 콘텐츠에서 쉽게 찾힌다.

### 검색·배포

- [ ] 운영 도메인에서 공개 문서·robots·sitemap·ads.txt의 HTTP 응답을 확인했다.
- [ ] Search Console URL 검사에서 공개 문서가 크롤링 가능하고 렌더링 본문이 사용자 화면과 일치한다.
- [ ] noindex 대상은 사이트맵에 들어 있지 않고, 공개 대상에는 의도하지 않은 noindex가 없다.
- [ ] canonical·제목·설명·JSON-LD의 URL, 언어, 날짜, 작성 주체가 실제 본문과 일치한다.
- [ ] 재심사 신청서에는 변경한 URL, 콘텐츠 품질 개선 사례, 광고 배치 원칙, 개인정보·ads.txt 검증 결과를 구체적으로 기록한다.

## 6. 공식 1차 자료 목록

아래 목록은 본 조사에서 직접 근거로 사용한 Google 공식 문서다. URL은 2026-08-23 기준으로 기록했으며, Google의 정책 통합·이전 과정에서 기존 URL이 새 게시자 정책 페이지로 리디렉션될 수 있다.

1. [Google 게시자 정책](https://support.google.com/adsense/answer/10502938?hl=ko) — 광고 게재 금지 콘텐츠, 광고 방해, 인벤토리 가치, 복제 콘텐츠, 개인정보 공개, 정확한 선언
2. [Google 애드센스 콘텐츠 및 사용자 환경](https://support.google.com/adsense/answer/10015918?hl=ko) — 고유 콘텐츠, 재방문 가치, 정기 업데이트, 스팸 정책 준수
3. [AdSense 사이트 준비](https://support.google.com/adsense/answer/7299563?hl=ko) — 명확한 탐색, 독창적이고 흥미로운 콘텐츠, 외부 자료 사용 시 추가 가치
4. [AdSense 자격 요건](https://support.google.com/adsense/answer/9724?hl=ko) — 고품질·독창적 콘텐츠와 정책 준수
5. [AdSense 계정이 승인되지 않음](https://support.google.com/adsense/answer/81904?hl=ko) — 부족한 텍스트, 완성도, 콘텐츠 품질, 탐색 문제의 공식 예시
6. [Ads.txt FAQ](https://support.google.com/adsense/answer/9785052?hl=ko) — 루트 파일, 게시자 ID, `DIRECT`/`RESELLER`, Google 판매자 선언
7. [AdSense 쿠키 사용 방식](https://support.google.com/adsense/answer/7549925?hl=ko) — 광고 태그·쿠키·개인정보처리방침 고지
8. [CMP 설정·관리](https://support.google.com/adsense/answer/7670013?hl=ko) — EEA·영국·스위스 동의·파트너 공개·동의 수집
9. [Google CMP 요건](https://support.google.com/adsense/answer/13554020?hl=en-GB) — 개인 맞춤 광고를 위한 Google 인증 CMP와 IAB TCF 요건
10. [Google Search Essentials](https://developers.google.com/search/docs/essentials?hl=ko) — 기술 요구사항, 스팸 정책, 핵심 검색 모범 사례
11. [도움이 되고 신뢰할 수 있는 사람 우선 콘텐츠](https://developers.google.com/search/docs/fundamentals/creating-helpful-content?hl=ko) — 원본성, 경험·전문성, 주된 목적, 검색엔진 우선 콘텐츠 경고
12. [SEO 기본 가이드](https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=ko) — 크롤링, 사이트 구조, 고유·최신·유용한 콘텐츠, 광고 사용자 환경
13. [JavaScript SEO 기본사항](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics?hl=ko) — 크롤러의 리소스 접근과 렌더링 확인
14. [구조화된 데이터 일반 가이드라인](https://developers.google.com/search/docs/appearance/structured-data/sd-policies?hl=ko) — 보이는 본문과의 일치, 원본성, 오해 방지, 노출 비보장
15. [Search Console 직접 조치 보고서 - 얇은 콘텐츠](https://support.google.com/webmasters/answer/9044175?hl=ko#thin-content) — 복제·스크랩·부가 가치가 거의 없는 페이지·도어웨이와 개선 방향

과거 링크: [Minimum content requirements로 안내되던 URL](https://support.google.com/adsense/answer/9335564?hl=ko) — 2026-08-23 현재 [Google 게시자 정책](https://support.google.com/adsense/answer/10502938?hl=ko)으로 이동

## 조사 방법과 한계

- Google AdSense 고객센터와 Google Search Central의 공개 문서만 사용했다.
- Google 정책의 문구는 수시로 바뀔 수 있으므로 재심사 신청 직전에 위 공식 URL과 AdSense 계정의 Policy Center를 다시 확인해야 한다.
- 공개 문서가 정책을 충족하는지와 AdSense가 실제로 승인하는지는 별개의 판단이다. 이 문서는 승인 가능성을 높이기 위한 검증 기준이지 승인 판정이 아니다.
- 한국 이용자를 중심으로 한 서비스라도 운영 도메인이 전 세계에 공개되어 있으면 지역별 동의 요구가 발생할 수 있다. 실제 광고 제품·지역·개인 맞춤 설정에 따라 CMP와 법률 검토 범위를 확정해야 한다.
