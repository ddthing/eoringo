# 백그라운드 Web Push 알림 운영 설정

이 기능은 페이지의 `new Notification()`이 아니라 Service Worker와 Web Push를 사용합니다. 따라서 탭을 닫아도 브라우저가 Push 이벤트를 받아 알림을 표시할 수 있습니다. 사용자는 HTTPS 사이트에서 알림 권한을 직접 허용해야 하며, 현재 앱에서는 영구 Google 계정과 원격 동기화가 필요합니다.

## 1. VAPID 키 생성

키는 한 번만 만들고 개인 키는 저장소에 커밋하지 않습니다.

```powershell
pnpm dlx web-push generate-vapid-keys
```

생성된 공개 키는 프론트 배포 환경의 `VITE_WEB_PUSH_PUBLIC_KEY`에 넣고, 개인 키는 Supabase Secret에만 넣습니다.

```text
VITE_REMOTE_SYNC_ENABLED=true
VITE_WEB_PUSH_PUBLIC_KEY=<public-vapid-key>
```

## 2. Supabase Secret 설정 및 함수 배포

```powershell
supabase link --project-ref <project-ref>
supabase secrets set `
  ALLOWED_ORIGINS=https://eoringo.pages.dev `
  ALLOW_LOCAL_ORIGINS=false `
  WEB_PUSH_VAPID_SUBJECT=mailto:admin@example.com `
  WEB_PUSH_VAPID_PUBLIC_KEY=<public-vapid-key> `
  WEB_PUSH_VAPID_PRIVATE_KEY=<private-vapid-key> `
  PUSH_CRON_SECRET=<long-random-cron-secret>

supabase functions deploy manage-push-subscription --project-ref <project-ref>
supabase functions deploy send-daily-task-notifications --project-ref <project-ref>
```

`WEB_PUSH_VAPID_PUBLIC_KEY`는 프론트의 공개 키와 같은 값이어야 합니다. `WEB_PUSH_VAPID_PRIVATE_KEY`, `PUSH_CRON_SECRET`, service-role 키는 `VITE_*` 변수나 브라우저 코드에 넣지 않습니다.

## 3. 매분 발송 스케줄 등록

Supabase Dashboard의 SQL Editor에서 Vault에 프로젝트 URL·publishable key·Cron secret을 저장한 뒤 `pg_cron`/`pg_net`으로 함수를 매분 호출합니다. 실제 값은 SQL 파일이나 저장소에 남기지 않습니다.

```sql
select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
select vault.create_secret('<publishable-key>', 'publishable_key');
select vault.create_secret('<long-random-cron-secret>', 'push_cron_secret');

select cron.schedule(
  'eoringo-send-daily-task-notifications',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
      || '/functions/v1/send-daily-task-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'publishable_key'),
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'publishable_key'),
      'X-Cron-Secret', (select decrypted_secret from vault.decrypted_secrets where name = 'push_cron_secret')
    ),
    body := '{"source":"supabase-cron"}'::jsonb
  ) as request_id;
  $$
);
```

같은 이름의 작업이 이미 있으면 새 작업을 만들지 말고 기존 작업을 확인합니다.

```sql
select jobid, jobname, schedule, active
from cron.job
where jobname = 'eoringo-send-daily-task-notifications';
```

## 4. 동작 확인

1. HTTPS로 배포된 사이트에서 Google 계정으로 로그인합니다.
2. 설정 → 알림에서 알림 권한을 허용하고 `앱이 닫혀도 미완료 숙제 알림`을 켭니다.
3. 알림 시간을 현재 시각에서 2~3분 뒤로 설정합니다.
4. 탭을 닫고, 브라우저 자체는 Push를 받을 수 있는 상태로 둡니다.
5. 알림이 도착하면 클릭해 숙제 화면으로 이동하는지 확인합니다.

발송 함수는 설정 시간 이후 같은 한국 날짜에 한 번만 발송하며, 자정이 지나면 저장된 일일 숙제 전체 목록으로 새 날짜의 미완료 상태를 계산합니다. 만료된 Push endpoint는 자동 삭제됩니다.

로컬 앱의 in-app 브라우저에서는 실제 OS Push 권한과 백그라운드 Service Worker를 검증할 수 없으므로, 최종 확인은 HTTPS 배포 환경에서 해야 합니다.
