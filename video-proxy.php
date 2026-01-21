<?php

declare(strict_types=1);

$file = $_GET['file'] ?? '';
if ($file === '') {
    http_response_code(400);
    echo 'Missing file parameter.';
    exit;
}

$root = __DIR__;
$allowedDirs = [
    realpath($root . '/user/images/reels'),
    realpath($root . '/user/pages/09.reels'),
];

$path = realpath($root . '/' . ltrim($file, '/'));
if ($path === false || !is_file($path)) {
    http_response_code(404);
    echo 'File not found.';
    exit;
}

$allowed = false;
foreach ($allowedDirs as $dir) {
    if ($dir && str_starts_with($path, $dir . DIRECTORY_SEPARATOR)) {
        $allowed = true;
        break;
    }
}

if (!$allowed) {
    http_response_code(403);
    echo 'Access denied.';
    exit;
}

$ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
$mimeMap = [
    'mp4' => 'video/mp4',
    'm4v' => 'video/x-m4v',
    'mov' => 'video/quicktime',
    'webm' => 'video/webm',
    'ogg' => 'video/ogg',
    'ogv' => 'video/ogg',
];
$mime = $mimeMap[$ext] ?? 'application/octet-stream';

$size = filesize($path);
$start = 0;
$end = $size - 1;

header('Content-Type: ' . $mime);
header('Accept-Ranges: bytes');
header('Content-Disposition: inline; filename="' . basename($path) . '"');

if (isset($_SERVER['HTTP_RANGE'])) {
    if (preg_match('/bytes=(\d*)-(\d*)/i', $_SERVER['HTTP_RANGE'], $matches)) {
        $rangeStart = $matches[1] !== '' ? (int)$matches[1] : null;
        $rangeEnd = $matches[2] !== '' ? (int)$matches[2] : null;

        if ($rangeStart === null && $rangeEnd !== null) {
            $start = max(0, $size - $rangeEnd);
        } elseif ($rangeStart !== null) {
            $start = $rangeStart;
        }

        if ($rangeEnd !== null) {
            $end = min($end, $rangeEnd);
        }

        if ($start > $end || $start >= $size) {
            header('Content-Range: bytes */' . $size);
            http_response_code(416);
            exit;
        }

        http_response_code(206);
        header('Content-Range: bytes ' . $start . '-' . $end . '/' . $size);
    }
}

$length = $end - $start + 1;
header('Content-Length: ' . $length);

while (ob_get_level()) {
    ob_end_clean();
}

$chunkSize = 8192;
$fp = fopen($path, 'rb');
fseek($fp, $start);

$bytesLeft = $length;
while ($bytesLeft > 0 && !feof($fp)) {
    $readLength = $bytesLeft > $chunkSize ? $chunkSize : $bytesLeft;
    $buffer = fread($fp, $readLength);
    if ($buffer === false) {
        break;
    }
    echo $buffer;
    flush();
    $bytesLeft -= strlen($buffer);
}

fclose($fp);
