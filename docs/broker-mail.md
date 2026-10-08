Broker email delivery for Batch B
================================

Broker application review, account blocking, and email ownership are independent state. Enqueuing receipt/decision notifications performs no network request. Failed or unavailable SMTP cannot undo the saved review decision. Broker privileges additionally require an approved application, complete required credentials, verified email ownership, and an active account.

Production configuration
------------------------

Set these environment values on the PHP/Apache process and on the scheduled worker. Keep real secrets out of source control. Restart the relevant processes after changing their environment.

| Variable | Purpose |
| --- | --- |
| `APP_URL` | Absolute site URL, including its installation subdirectory, for example `https://locus.example.gov.ph`. HTTPS is required outside local loopback. |
| `SMTP_HOST` | SMTP provider hostname. |
| `SMTP_PORT` | Provider port; default 587. |
| `SMTP_USERNAME` | SMTP authentication username. |
| `SMTP_PASSWORD` | Provider SMTP password or application password. |
| `SMTP_ENCRYPTION` | `tls` for STARTTLS (default) or `ssl` for implicit TLS, commonly port 465. |
| `SMTP_AUTH` | Authentication enabled (default true); production requires authentication. |
| `MAIL_FROM_EMAIL` | Authorized, valid sender address. |
| `MAIL_FROM_NAME` | Sender display name; default LOCUS-SF. |
| `BROKER_SUPPORT_CONTACT` | Support email address, phone number, or other approved support contact included in reviewed blocking notifications; email addresses also become Reply-To. |
| `EMAIL_VERIFICATION_TTL_SECONDS` | Link lifetime in seconds; default 86400 (24 hours), clamped from 300 to 604800. |
| `BROKER_MAIL_MAX_ATTEMPTS` | Maximum automatic delivery attempts; default 6. |

The corresponding private configuration keys are `mail.smtp_host`, `smtp_port`, `smtp_username`, `smtp_password`, `smtp_encryption`, `smtp_auth`, `from_email`, `from_name`, `support_contact`, `verification_ttl_seconds`, and `max_attempts`. The `mail` section belongs at the configuration array's top level. Use the SMTP provider's sender/domain verification settings, SPF, and DKIM instructions. The recipient can be any email address accepted by existing registration validation, including Gmail; Google Sign-In is not required.

Run the worker regularly (for example once per minute through Windows Task Scheduler or cron):

```powershell
C:\xampp\php\php.exe C:\xampp\htdocs\sfcelerate-bizstart\scripts\process-broker-mail.php --limit=20
```

The process emits counts without recipient addresses or link tokens. Exit status is 0 when processing succeeded, 1 for a delivery/processing failure, and 2 when mail is unconfigured. It connects to the existing database directly and does not seed accounts, create a database, migrate schema, run private administrator setup, or initialize unrelated application services. Do not configure production SMTP while running synthetic workflow tests against a database containing real queued applicants. Back up and apply `database/migrate-broker-batch-b.php` before deploying the updated workflows.

Delivery and retry behavior
---------------------------

`broker_mail_outbox` persists one receipt per application revision and one decision message per review event. Unique deduplication keys make repeated application/API requests safe. The states are `pending`, `sending`, `sent`, `failed`, and `unconfigured`, with timestamps, attempts, the next retry time, and a safe error explanation. Applicant and authorized review screens show these states without claiming that unconfigured/failed delivery sent an email. If outbox tracking is temporarily unavailable, status responses report `enqueue_failed` with a safe explanation, while saved application decisions remain intact.

Each worker pass first reconciles a bounded number of saved review events and current pending submissions against their stable outbox keys. A decision saved while its notification insert failed is automatically requeued once storage becomes available. Current pending application revisions greater than zero also recover missing receipt messages; legacy revision-zero receipt records are excluded. Imported historical review snapshots marked `source=legacy_review` never produce new notifications. An explicitly recorded Batch B review of a legacy revision-zero applicant remains eligible for notification recovery. Existing outbox rows, including sent messages, remain deduplicated. The worker reports recovery counts without exposing recipient data. Reconciliation and SMTP processing each respect the selected batch limit.

Only successful SMTP acceptance produces `sent`; this does not prove inbox delivery or that the recipient read the message. Failures retry with increasing delays, bounded by `BROKER_MAIL_MAX_ATTEMPTS`. An authorized manual retry requeues a failed/unconfigured message. Sent messages are never requeued. A worker claim prevents concurrent delivery of the same outbox row; interrupted claims recover after 15 minutes. An SMTP connection can fail after the server accepted a message, so an ambiguous interruption can still result in a retry. Stable SMTP Message-ID values help identify such duplicates; a transactional database cannot guarantee exactly-once delivery through SMTP.

The worker does not store rendered mail or raw verification tokens. It constructs each email in memory at delivery time, stores only a SHA-256 token hash plus the target email snapshot in `email_verification_tokens`, and binds verification to the current address. Verification links use a URL fragment so the raw token does not enter normal request URLs or access logs. Opening the page does not consume the link; the applicant must explicitly submit the CSRF-protected Verify email form. Link generation starts its expiration clock when delivery is attempted. A newly issued link invalidates earlier links, and a used, expired, or address-mismatched link is rejected.

Resend requires an authenticated broker account, a CSRF token, and at least 60 seconds since the prior receipt/verification queue entry. A shared per-IP limit allows at most 10 resend requests per hour. Token confirmation is also limited to 30 submissions per IP per hour. Rate limits use the project's locked file counters and the user row lock for concurrent resend requests. Blocking account access does not itself change email ownership.

Reviewed blocking notifications wait in `unconfigured` state when no support contact is configured. Review reasons come from saved reviewer decisions. Transport diagnostics and SMTP credentials are not returned to the browser or printed by the worker.

Local mail capture and checks
-----------------------------

`tests/broker-mail.test.php` uses an isolated SQLite database and starts a bounded loopback-only authenticated SMTP capture process. It uses synthetic `.test` addresses and removes captured messages after checking them. It neither loads the real application configuration nor writes the production/local application database. Run:

```powershell
C:\xampp\php\php.exe tests\broker-mail.test.php
```

The checks cover unconfigured and failed delivery, saved decisions after SMTP failure, transaction ownership, notification deduplication, retries, rate limits, expired/used/replaced/address-mismatched links, hashed token storage, the required receipt/approval/blocked wording, and actual authenticated SMTP acceptance through PHPMailer. These automated checks do not constitute user acceptance testing with a configured provider mailbox.

Add `--integration` to also run against a disposable database on the configured local MySQL server. The integration path requires `APP_ENV=local` and a loopback database host, creates its own randomly named `locus_broker_mail_test_*` schema, runs the actual Batch B schema manager twice, uses native prepared statements, checks token consumption, queue claims/deduplication, retry/rollback behavior and saved decisions after delivery failure, then drops only that test database. It also simulates an unavailable outbox table, commits a saved decision independently, restores storage, and verifies bounded recovery without duplicate notifications, legacy receipts, or imported historical decision mail. A second database connection confirms that queuing uses current locked recipient/ownership data even when an outer transaction previously established an older snapshot. It never processes the configured application's outbox or connects to a real SMTP provider. The October 8, 2026 implementation checks passed 67 assertions with this option, including the local authenticated SMTP capture.

For manual local UI testing, run a mail-capture service on loopback and use `APP_ENV=local`, a loopback `APP_URL`, `SMTP_HOST=127.0.0.1`, its capture port, and an approved synthetic sender. `SMTP_ENCRYPTION=none` and `SMTP_AUTH=false` are permitted only for a local environment and a loopback SMTP host. Unencrypted or unauthenticated remote SMTP is rejected. Configure production credentials only when deliberately enabling real email delivery.

Mailer provenance
------------------

The project manually loads the SMTP, message, and exception classes from the official maintained [PHPMailer 7.1.1 release](https://github.com/PHPMailer/PHPMailer/releases/tag/v7.1.1), following its documented [manual installation and SMTP usage](https://github.com/PHPMailer/PHPMailer/tree/v7.1.1). Upstream source, LGPL license, and provenance are preserved in `app/ThirdParty/PHPMailer`. Certificate verification remains enabled; no custom insecure TLS options are installed. Update the pinned runtime files together and rerun the SMTP-capture checks when upgrading.
