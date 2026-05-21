<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/mailer.php';

final class EmailHelper
{
    public static function sendDipanggil(
        string $toEmail,
        string $toName,
        string $judulLowongan,
        string $perusahaan,
        string $chatUrl
    ): void {
        self::send(
            $toEmail,
            $toName,
            "Kamu Dipanggil Interview - {$judulLowongan}",
            self::layout(
                '#ef4444',
                'Selamat, ' . self::e($toName ?: 'Kandidat') . '!',
                '<p>Kamu dipanggil untuk interview di:</p>' .
                self::detailBox($judulLowongan, $perusahaan) .
                '<p>HRD mengundangmu untuk berdiskusi melalui chat. Silakan buka link berikut:</p>' .
                self::button($chatUrl, 'Buka Chat Sekarang', '#ef4444') .
                '<p style="color: #6b7280; font-size: 14px;">Jika tombol tidak berfungsi, copy link ini: ' . self::e($chatUrl) . '</p>'
            ),
            'Email dipanggil failed'
        );
    }

    public static function sendDiterima(string $toEmail, string $toName, string $judulLowongan, string $perusahaan): void
    {
        $lamaranUrl = self::clientUrl() . '/mahasiswa/lamaran';
        self::send(
            $toEmail,
            $toName,
            "Selamat! Kamu Diterima - {$judulLowongan}",
            self::layout(
                '#22c55e',
                'Selamat ' . self::e($toName ?: 'Kandidat') . '! Kamu DITERIMA!',
                '<p>Kamu berhasil diterima sebagai intern di:</p>' .
                self::detailBox($judulLowongan, $perusahaan, '#f0fdf4', '#22c55e') .
                '<p>Pihak perusahaan akan menghubungimu lebih lanjut mengenai onboarding.</p>' .
                self::button($lamaranUrl, 'Lihat Lamaranku', '#22c55e')
            ),
            'Email diterima failed'
        );
    }

    public static function sendDitolak(string $toEmail, string $toName, string $judulLowongan, string $perusahaan): void
    {
        $lowonganUrl = self::clientUrl() . '/mahasiswa/lowongan';
        self::send(
            $toEmail,
            $toName,
            "Update Lamaran - {$judulLowongan}",
            self::layout(
                '#6b7280',
                'Halo ' . self::e($toName ?: 'Kandidat') . ',',
                '<p>Terima kasih sudah melamar di:</p>' .
                self::detailBox($judulLowongan, $perusahaan) .
                '<p>Setelah melalui proses seleksi, perusahaan memutuskan untuk melanjutkan dengan kandidat lain. Jangan menyerah, masih banyak kesempatan lain.</p>' .
                self::button($lowonganUrl, 'Cari Lowongan Lain', '#ef4444')
            ),
            'Email ditolak failed'
        );
    }

    public static function sendResetPassword(string $toEmail, string $toName, string $resetToken): void
    {
        $resetUrl = self::clientUrl() . '/auth/reset-password?token=' . rawurlencode($resetToken);
        self::send(
            $toEmail,
            $toName ?: 'User',
            'Reset Password - intern-link',
            self::layout(
                '#ef4444',
                'Reset Password',
                '<p>Halo ' . self::e($toName ?: 'User') . ',</p>' .
                '<p>Kami menerima permintaan reset password untuk akunmu. Klik tombol di bawah untuk membuat password baru:</p>' .
                self::button($resetUrl, 'Reset Password', '#ef4444') .
                '<p style="color: #6b7280; font-size: 14px;">Link ini berlaku selama <strong>1 jam</strong>.</p>' .
                '<p style="color: #6b7280; font-size: 14px;">Jika kamu tidak meminta reset password, abaikan email ini.</p>' .
                '<p style="color: #6b7280; font-size: 14px;">Atau copy link ini: ' . self::e($resetUrl) . '</p>'
            ),
            'Email reset password failed'
        );
    }

    private static function send(string $toEmail, string $toName, string $subject, string $body, string $logPrefix): void
    {
        try {
            $mail = createMailer();
            $mail->addAddress($toEmail, $toName ?: 'User');
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body = $body;
            $mail->send();
        } catch (Throwable $error) {
            error_log($logPrefix . ': ' . $error->getMessage());
        }
    }

    private static function layout(string $brandColor, string $heading, string $content): string
    {
        return '
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: ' . self::e($brandColor) . '; padding: 24px; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0;">intern-link</h1>
            </div>
            <div style="padding: 24px; background: #fff; border: 1px solid #e5e7eb;">
              <h2>' . $heading . '</h2>
              ' . $content . '
            </div>
            <div style="padding: 16px; text-align: center; color: #9ca3af; font-size: 12px;">
              intern-link - Connecting Talents to Opportunities
            </div>
          </div>
        ';
    }

    private static function detailBox(
        string $judulLowongan,
        string $perusahaan,
        string $background = '#f9fafb',
        ?string $accent = null
    ): string {
        $border = $accent ? ' border-left: 4px solid ' . self::e($accent) . ';' : '';

        return '<div style="background: ' . self::e($background) . '; padding: 16px; border-radius: 8px; margin: 16px 0;' . $border . '">' .
            '<strong>Posisi:</strong> ' . self::e($judulLowongan) . '<br>' .
            '<strong>Perusahaan:</strong> ' . self::e($perusahaan) .
            '</div>';
    }

    private static function button(string $url, string $label, string $background): string
    {
        return '<a href="' . self::e($url) . '" style="display: inline-block; background: ' . self::e($background) . '; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">' .
            self::e($label) .
            '</a>';
    }

    private static function clientUrl(): string
    {
        $configured = getenv('CLIENT_URL');
        if (is_string($configured) && trim($configured) !== '') {
            $first = trim(explode(',', $configured)[0]);
            if ($first !== '') {
                return rtrim($first, '/');
            }
        }

        return 'https://intern-link.hawali.site';
    }

    private static function e(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}
