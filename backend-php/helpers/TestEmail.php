<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/load-env.php';
require_once __DIR__ . '/../config/mailer.php';

try {
    $mail = createMailer();
    $debugOutput = '';
    $mail->SMTPDebug = 2;
    $mail->Debugoutput = static function (string $message) use (&$debugOutput): void {
        $debugOutput .= $message . "\n";
    };
    $mail->addAddress(getenv('TEST_EMAIL') ?: 'test@example.com');
    $mail->isHTML(true);
    $mail->Subject = 'Test Email - intern-link';
    $mail->Body = '<h1>Email berhasil dikirim via Resend!</h1><p>intern-link email system is working.</p>';
    $mail->send();
    echo "Email berhasil dikirim!\n";
} catch (Throwable $error) {
    echo 'Gagal: ' . $error->getMessage() . "\n";
    if (isset($debugOutput) && trim($debugOutput) !== '') {
        echo trim($debugOutput) . "\n";
    }
}
