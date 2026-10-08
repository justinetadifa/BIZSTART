# Hosted administrator sign-in

The public demo account is for local XAMPP development. Hosted sign-in requires an active, verified city staff account with a separate password.

This workspace includes a private, one-time configuration at `app/admin-access.local.php`. It contains the prepared administrator email, CICTO department and password hash. The password is supplied privately in the development conversation; it is never written into a public page, JavaScript, or documentation. The private file is excluded from Git and blocks direct requests in addition to the existing `app/.htaccess` protection.

Upload the complete current application so its PHP helpers, scripts and styles stay compatible. The following are key files for administrator setup, not a standalone patch:

- `app/bootstrap.php`
- `app/Support/AdminAccountSetup.php`
- `app/admin-access.local.php` (include this explicitly when uploading; Git excludes it)
- `app/.htaccess`
- `app/Support/account-view.php`
- `assets/css/auth-interface.css`

Keep the hosted `app/config.local.php`, database connection settings, existing uploaded files and data. Do not replace them with local development copies. The setup uses the hosted database and its existing `users` table; it does not migrate schemas or seed catalogue records.

Open `https://locus-sf.site/admin-login.php`, choose **Sign in**, and enter the prepared email and password. The first application initialization creates exactly one active, verified CICTO account if that email is unused. Accept the privacy notice when prompted, then enter the city dashboard.

After the first successful hosted sign-in, remove `app/admin-access.local.php` from the server. The database account remains available. Repeated initialization preserves an existing account's password, name, department and statuses; it does not turn investor or broker accounts into staff, or reactivate suspended accounts. Uploading the configuration again will not reset a changed password.

If the configured email is already used by another role or an inactive/unverified account, setup refuses to change it. A hosting operator must resolve that account conflict. A setup failure is logged without credentials and does not interrupt the public catalogue.

The host must support PHP 8, mbstring and PDO MySQL. The existing `users` table needs its department and identity verification columns; older tables without `account_status` are supported. If setup fails, check the server log and these prerequisites before retrying.

For an existing active, verified administrator that needs a new password, the hosting operator can use the CLI-only recovery utility described in [admin-access-recovery.md](admin-access-recovery.md).
