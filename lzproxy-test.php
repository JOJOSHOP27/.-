<?php
// ============================================================
// LZPEDIA PROXY - JOELL SHOP v2.5
// ============================================================

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');

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
if ($action === 'create') {
    if ($amount <= 0) {
        echo json_encode([
            'success' => false,
            'error' => 'Amount harus lebih dari 0',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        exit;
    }
    $url = $baseUrl . '/invoice?apikey=' . urlencode($apiKey) . '&amount=' . $amount;
} elseif ($action === 'status') {
    if (empty($invoiceId)) {
        echo json_encode([
            'success' => false,
            'error' => 'invoice_id wajib diisi',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        exit;
    }
    $url = $baseUrl . '/invoice/status?apikey=' . urlencode($apiKey) . '&invoice_id=' . urlencode($invoiceId);
} else {
    echo json_encode([
        'success' => false,
        'error' => 'Aksi tidak valid. Gunakan action=create atau action=status',
        'timestamp' => date('Y-m-d H:i:s')
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

// Cek error cURL
if ($curlError) {
    echo json_encode([
        'success' => false,
        'error' => 'cURL Error: ' . $curlError,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit;
}

// Cek HTTP status
if ($httpCode !== 200) {
    echo json_encode([
        'success' => false,
        'error' => 'HTTP Error: ' . $httpCode,
        'response' => substr($response, 0, 200),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit;
}

// Parse JSON
$data = json_decode($response, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    echo json_encode([
        'success' => false,
        'error' => 'Invalid JSON response: ' . substr($response, 0, 200),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit;
}

// Kirim respons
echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
exit;
?>
