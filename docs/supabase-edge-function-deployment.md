# Supabase Edge Function 배포 설정

운영 사이트에서 `백업 후 데이터 이어가기`가 JSON 파일만 다운로드하고 이전을 완료하지 못하면, Supabase Edge Function의 운영 Origin 설정과 배포 상태를 먼저 확인합니다.

## 운영 설정

`migrate-local-data`와 `sync-character-images`는 정확한 Origin만 허용합니다. Supabase 프로젝트의 Secret에 다음 값을 설정합니다.

```powershell
supabase login
supabase link --project-ref <project-ref>
supabase secrets set ALLOWED_ORIGINS=https://eoringo.pages.dev ALLOW_LOCAL_ORIGINS=false
```

Preview 도메인도 사용할 경우 `ALLOWED_ORIGINS`에 쉼표로 정확히 추가합니다. 와일드카드(`*`)는 사용하지 않습니다.

## 함수 배포

Origin 정책을 포함한 현재 소스를 배포합니다.

```powershell
supabase functions deploy migrate-local-data --project-ref <project-ref>
supabase functions deploy sync-character-images --project-ref <project-ref>
```

`sync-character-images`를 아직 사용하지 않는 환경에서는 두 번째 명령을 생략해도 됩니다.

## 배포 전 읽기 전용 확인

공개 키와 운영 URL로 인증 없는 요청을 보내면 데이터는 변경되지 않습니다. Origin이 허용된 함수는 `authentication_required`를 반환해야 합니다.

```powershell
curl.exe -sS -i -X POST `
  "https://<project-ref>.supabase.co/functions/v1/migrate-local-data" `
  -H "Origin: https://eoringo.pages.dev" `
  -H "apikey: <publishable-key>" `
  -H "Content-Type: application/json" `
  --data "{}"
```

- 정상적인 Origin 설정: `401` 및 `{"code":"authentication_required"}`
- 설정 누락 또는 이전 버전 함수: `403` 및 `{"code":"origin_rejected"}`

이 확인은 실제 사용자 토큰이나 문서를 전송하지 않으므로 마이그레이션 데이터를 변경하지 않습니다. 이후 Google 계정으로 로그인한 상태에서 실제 이전을 실행하고, 성공 메시지와 계정별 동기화 데이터를 확인합니다.
