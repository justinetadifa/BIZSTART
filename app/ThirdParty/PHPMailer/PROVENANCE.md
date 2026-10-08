PHPMailer 7.1.1, pinned official release: https://github.com/PHPMailer/PHPMailer/releases/tag/v7.1.1

Downloaded unmodified from https://raw.githubusercontent.com/PHPMailer/PHPMailer/v7.1.1/ on 2026-10-08.

Included runtime files: `src/Exception.php`, `src/PHPMailer.php`, `src/SMTP.php`. Upstream `LICENSE`, `README.md`, and `composer.json` are retained. The SMTP, exception, and message classes are loaded explicitly because this project does not use Composer.

License: GNU Lesser General Public License 2.1; see `LICENSE`.

When updating, replace these files together from a tagged official release, retain the license and provenance, and rerun `tests/broker-mail.test.php` including its local SMTP capture.
