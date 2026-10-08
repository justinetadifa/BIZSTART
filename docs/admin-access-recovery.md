# Recover an existing city administrator

The public **Sign in** tab uses the email and password of an existing city staff account. **Activate account** creates a new staff account and requires CICTO authorization. Local demonstration passwords are blocked on a public deployment such as `https://locus-sf.site`.

Recovery needs the hosting owner or an authorized operator with server access. Someone who only has the public website cannot run this procedure. If there is no existing active, verified administrator, the hosting owner must provision access through the approved CICTO process; this utility does not create, promote or reactivate accounts.

On the deployed server, from the project directory, first inspect the intended account:

```sh
php scripts/reset-admin-password.php --email=existing-staff@example.gov.ph --check
```

This reads the deployment's `app/config.local.php` and environment database settings. It does not load the app bootstrap, create a database, migrate tables or seed demo accounts. Check that this is the intended deployment before resetting a credential.

With Bash, supply the new password and confirmation through hidden prompts and stdin:

```bash
read -r -s -p 'New password: ' locus_recovery_password
printf '\n'
read -r -s -p 'Confirm password: ' locus_recovery_confirmation
printf '\n'
printf '%s\n%s\n' "$locus_recovery_password" "$locus_recovery_confirmation" | php scripts/reset-admin-password.php --email=existing-staff@example.gov.ph --apply --password-stdin
unset locus_recovery_password locus_recovery_confirmation
```

Use a private password of at least eight characters and at most 72 bytes. The command refuses public demonstration passwords, the existing password, mismatched confirmation, unknown accounts, non-admin roles, inactive/disabled/suspended accounts and unverified staff. It updates only the intended account's `password_hash`; department, role and access status remain intact. A concurrent suspension or password change stops the reset.

Passwords must never appear in command arguments, terminal history, screenshots, chat or logs. Direct terminal password input is refused because PHP would echo it. Do not enable shell tracing when using the Bash example.

If the hosting service offers only a control panel or phpMyAdmin, ask its owner to perform the equivalent recovery using a PHP `password_hash` result for the selected eligible administrator. A plaintext password or MD5/SHA SQL hash will not work. Do not import the demo seed or change the account's role/verification/status to bypass sign-in.

After the operator finishes, use **Sign in** on `/admin-login.php` with that account's existing email and its new password.

Validation:

```sh
php tests/admin-password-recovery.test.php
```

The test uses an isolated SQLite database in memory and never connects to the deployment database.
