<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/load-env.php';
require_once __DIR__ . '/../config/mailer.php';

$subject = 'Test Email - intern-link';
$body = '<h1>Email berhasil dikirim via Resend!</h1><p>intern-link email system is working.</p>';
$to = getenv('TEST_EMAIL') ?: 'test@example.com';

try {
    $mail = createMailer();
    $debugOutput = '';
    $mail->SMTPDebug = 2;
    $mail->Debugoutput = static function (string $message) use (&$debugOutput): void {
        $debugOutput .= $message . "\n";
    };
    $mail->addAddress($to);
    $mail->isHTML(true);
    $mail->Subject = $subject;
    $mail->Body = $body;
    $mail->send();
    echo "Email berhasil dikirim via SMTP!\n";
} catch (Throwable $error) {
    echo 'SMTP gagal: ' . $error->getMessage() . "\n";
    if (isset($debugOutput) && trim($debugOutput) !== '') {
        echo trim($debugOutput) . "\n";
    }

    try {
        sendViaResendApiForTest($to, $subject, $body);
        echo "Email berhasil dikirim via Resend API fallback!\n";
    } catch (Throwable $fallbackError) {
        echo 'Fallback API gagal: ' . $fallbackError->getMessage() . "\n";
    }
}

function sendViaResendApiForTest(string $to, string $subject, string $body): void
{
    $apiKey = getenv('RESEND_API_KEY') ?: getenv('MAIL_PASSWORD') ?: '';
    if (!is_string($apiKey) || trim($apiKey) === '') {
        throw new RuntimeException('RESEND_API_KEY or MAIL_PASSWORD is required.');
    }

    $payload = json_encode([
        'from' => (getenv('MAIL_FROM_NAME') ?: 'intern-link') . ' <' . (getenv('MAIL_FROM_ADDRESS') ?: 'noreply@intern-link.hawali.site') . '>',
        'to' => [$to],
        'subject' => $subject,
        'html' => $body,
    ], JSON_UNESCAPED_SLASHES);

    if ($payload === false) {
        throw new RuntimeException('Failed to encode payload.');
    }

    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => "Authorization: Bearer {$apiKey}\r\nContent-Type: application/json\r\n",
            'content' => $payload,
            'timeout' => 10,
            'ignore_errors' => true,
        ],
    ]);
    $response = @file_get_contents('https://api.resend.com/emails', false, $context);
    $statusLine = $http_response_header[0] ?? '';

    if ($response === false || !str_contains($statusLine, ' 200 ') && !str_contains($statusLine, ' 202 ')) {
        throw new RuntimeException(trim($statusLine . ' ' . (string) $response));
    }
}
