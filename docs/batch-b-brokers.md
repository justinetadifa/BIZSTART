# Batch B: broker onboarding and review

Broker applications now require a full name, numeric PRC registration, current expiration date, and separate front/back ID images. Registration accepts valid email addresses, including Gmail. Login has no document-upload fields. Existing applicants can add or replace images from their profile and submit for review.

Images accept JPEG, PNG and WebP, at most 5 MB each, 10,000 pixels per side and 16 megapixels. Server checks use fileinfo, actual dimensions, GD decoding, the HTTP upload boundary and stored SHA-256 integrity. PHP needs `fileinfo` and `gd`; `upload_max_filesize` must allow 5 MB and `post_max_size` must allow both files plus form fields. GD was enabled in this local XAMPP PHP configuration; restart Apache to load the change into its PHP process.

Private images are stored in `data/broker-documents` with random names and an Apache deny rule. Keep `data/.htaccess` protection in deployments, and configure equivalent denial on servers that ignore Apache rules. The development router also denies `data`. Back up the private directory together with the database, restrict filesystem access to the application operator, and apply the city's retention policy. Images never enter the public image/CDN pipeline. `api/broker-document.php` permits only the signed-in applicant or an explicitly authorized reviewer; blocked sessions lose access. Responses disable caching. Historical document references remain restricted to the same applicant.

ICT/CICTO retains technical administration, role assignment and existing listing governance. ICT can grant or revoke broker-review authority only for CAO/Assessor and LEBDO personnel under **City accounts**. New and existing accounts receive no reviewer grant automatically, including passkey activation. An ICT role alone cannot read the private broker queue, inspect IDs or approve applications. Review permissions are checked again on the server. Authorized reviewers can approve, request corrections, reject, or block with saved reasons, findings, reviewer identity and time. Approval also requires an explicit PRC check and complete current credentials; block requires documented findings. Images and lookups never automatically classify fraud.

Application review, email ownership and account access remain separate. Broker operations require an approved application, verified email, both ID images, current PRC validity and an active account. Changing reviewed credentials or images requires fresh review. Correction/rejection permits profile updates; blocking revokes existing authenticated sessions and advances a session version so old sessions cannot revive after account restoration. Review history retains document references. Repeated identical decisions and unchanged pending submissions do not create duplicate notifications.

Run the targeted migration without bootstrapping or seeding:

```powershell
C:\xampp\php\php.exe database\migrate-broker-batch-b.php --dry-run
C:\xampp\php\php.exe database\migrate-broker-batch-b.php --apply
```

It adds email-verification, reviewer-grant, session-version and document columns plus review history, token and mail-outbox tables. It compares every pre-existing user, seller-profile and property field before/after and supports safe re-runs. Existing approvals and prices are preserved. Existing brokers must supply missing images and verify email before broker privileges are available. No verification, reviewer authority, credentials or review findings are inferred.

Configure authenticated SMTP, the canonical `APP_URL`, sender and support contact, then schedule the mail worker as described in [broker-mail.md](broker-mail.md). Unconfigured or failed delivery remains visible and does not undo a saved application/review. No real SMTP credentials are configured in this run; live provider delivery remains pending setup.

Relevant checks:

```powershell
C:\xampp\php\php.exe tests\broker-application.test.php
C:\xampp\php\php.exe tests\broker-upload.test.php
C:\xampp\php\php.exe tests\broker-permissions.test.php
C:\xampp\php\php.exe tests\broker-mail.test.php --integration
C:\xampp\php\php.exe tests\broker-profile-photo.test.php
C:\xampp\php\php.exe tests\account-workflow.test.php
npm.cmd run build:css
```

Integration tests use disposable local databases, synthetic applicants and loopback SMTP capture, with no real outbound email. Browser checks use mocked data at desktop/mobile widths. These checks do not constitute UAT. Batch C is separate.

Verification on 2026-10-08: application 60, real multipart upload 8, permissions/private endpoints/sessions 53, mail 67, profile-photo 16, and account workflow 33 checks passed (237 total). Mocked Chrome checks passed at 1280px and 390px, including pending-applicant dashboard access, authorized broker inbox access, reviewer separation and notification retries; local evidence is in `scratch/batch-b/ui-results.txt`. PHP/JavaScript syntax, CSS build, listing lifecycle/pricing and assessment regression checks also passed.

The local migration preserved every pre-existing field across 11 users, 4 seller profiles and 16 properties. The mail worker correctly reported unconfigured delivery with zero queued notifications and no outbound email. Restart local Apache for the enabled GD extension; configure SMTP and the scheduled worker before validating real provider delivery. ICT must explicitly assign reviewer grants before staff can review applications.
