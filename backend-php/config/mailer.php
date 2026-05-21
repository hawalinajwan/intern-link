<?php

declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;

$vendorAutoload = __DIR__ . '/../vendor/autoload.php';
if (is_file($vendorAutoload)) {
    require_once $vendorAutoload;
} else {
    require_once __DIR__ . '/../lib/PHPMailer/Exception.php';
    require_once __DIR__ . '/../lib/PHPMailer/PHPMailer.php';
    require_once __DIR__ . '/../lib/PHPMailer/SMTP.php';
}

function createMailer(): PHPMailer
{
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = 'smtp.resend.com';
    $mail->SMTPAuth = true;
    $mail->Username = 'resend';
    $mail->Password = getenv('MAIL_PASSWORD') ?: getenv('RESEND_API_KEY') ?: '';
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = 587;
    $mail->CharSet = 'UTF-8';
    $mail->SMTPDebug = 0;
    $mail->Timeout = (int) (getenv('MAIL_TIMEOUT') ?: 10);
    $mail->setFrom(
        getenv('MAIL_FROM_ADDRESS') ?: 'noreply@intern-link.hawali.site',
        getenv('MAIL_FROM_NAME') ?: 'intern-link'
    );

    return $mail;
}
