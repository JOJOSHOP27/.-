<?php
// ============================================================
// LZPEDIA PROXY - FINAL VERSION
// ============================================================

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Konfigurasi
$apiKey = 'LXZ_015d8a759df64d48';
$baseUrl = 'https://app.lzpedia.my.id/api';

// Ambil parameter
$action = isset($_GET['action']) ? $_GET['action'] : '';
$amount = isset($_GET['amount']) ? (int)$_GET['amount'] : 0;
$invoiceId = isset($_GET['invoice_id']) ? $_GET['invoice_id'] : '';

// Validasi
if (empty($action)) {
    echo json_encode([
        'success' => false,
        'error' => 'Parameter action wajib diisi (create atau status)'
    ]);
    exit;
}

// Buat URL
if ($action === 'create') {
    if ($amount <= 0) {
        echo json_encode([
            'success' => false,
            'error' => 'Amount harus lebih dari 0'
        ]);
        exit;
    }
    $url = $baseUrl . '/invoice?apikey=' . urlencode($apiKey) . '&amount=' . $amount;
} elseif ($action === 'status') {
    if (empty($invoiceId)) {
        echo json_encode([
            'success' => false,
            'error' => 'invoice_id wajib diisi'
        ]);
        exit;
    }
    $url = $baseUrl . '/invoice/status?apikey=' . urlencode($apiKey) . '&invoice_id=' . urlencode($invoiceId);
} else {
    echo json_encode([
        'success' => false,
        'error' => 'Action tidak valid. Gunakan create atau status'
    ]);
    exit;
}

// Eksekusi cURL
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => false,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_HTTPHEADER => ['Accept: application/json'],
    CURLOPT_USERAGENT => 'JOELL-SHOP/2.0'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

// Cek error
if ($curlError) {
    echo json_encode([
        'success' => false,
        'error' => 'cURL Error: ' . $curlError
    ]);
    exit;
}

if ($httpCode !== 200) {
    echo json_encode([
        'success' => false,
        'error' => 'HTTP Error: ' . $httpCode,
        'response' => substr($response, 0, 200)
    ]);
    exit;
}

// Kirim response
echo $response;
?>
