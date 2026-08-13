<?php
// ============================================================
// LZPEDIA PROXY - TEST & DEBUG VERSION
// Gunakan untuk mengecek koneksi ke API LZPedia
// ============================================================

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$apiKey = 'LXZ_015d8a759df64d48';
$baseUrl = 'https://app.lzpedia.my.id/api';

// Test 1: Cek apakah PHP & cURL aktif
$tests = [];
$tests['php_version'] = PHP_VERSION;
$tests['curl_enabled'] = function_exists('curl_init');
$tests['json_enabled'] = function_exists('json_encode');
$tests['timestamp'] = date('Y-m-d H:i:s');

// Test 2: Coba koneksi ke LZPedia
if (function_exists('curl_init')) {
    $testUrl = $baseUrl . '/invoice?apikey=' . urlencode($apiKey) . '&amount=5000&product=Test';

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $testUrl,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTPHEADER => ['Accept: application/json']
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    $info = curl_getinfo($ch);
    curl_close($ch);

    $tests['lzpedia_http_code'] = $httpCode;
    $tests['lzpedia_curl_error'] = $curlError ?: null;
    $tests['lzpedia_url'] = $testUrl;

    // Coba parse response
    $data = json_decode($response, true);
    if (json_last_error() === JSON_ERROR_NONE) {
        $tests['lzpedia_response_valid_json'] = true;
        $tests['lzpedia_response'] = $data;
        if (isset($data['success']) && $data['success'] === true) {
            $tests['lzpedia_status'] = '✅ CONNECTED - API Bekerja';
        } else {
            $tests['lzpedia_status'] = '⚠️ API Error: ' . ($data['message'] ?? 'Unknown error');
        }
    } else {
        $tests['lzpedia_response_valid_json'] = false;
        $tests['lzpedia_raw_response'] = substr($response, 0, 500);
        $tests['lzpedia_status'] = '❌ Invalid JSON Response';
    }
    
    $tests['curl_info'] = [
        'total_time' => $info['total_time'] ?? 0,
        'size_download' => $info['size_download'] ?? 0,
        'speed_download' => $info['speed_download'] ?? 0
    ];
} else {
    $tests['error'] = 'cURL tidak tersedia di server ini';
}

// Test 3: Cek backend proxy (jika ada)
$tests['backend_proxy_check'] = [
    'url' => $_SERVER['REQUEST_SCHEME'] . '://' . $_SERVER['HTTP_HOST'] . '/api/lzpedia',
    'exists' => file_exists(__DIR__ . '/api/lzpedia.js') || file_exists(__DIR__ . '/../api/lzpedia.js')
];

echo json_encode($tests, JSON_PRETTY_PRINT);