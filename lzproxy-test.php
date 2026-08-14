<?php
// ============================================================
// LZPEDIA PROXY - PERMANEN VERSION 1.0
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
        sendError('Amount harus lebih dari 0');
    }
    $url = $baseUrl . '/invoice?apikey=' . urlencode($apiKey) . '&amount=' . $amount;
} elseif ($action === 'status') {
    if (empty($invoiceId)) {
        sendError('invoice_id wajib diisi');
    }
    $url = $baseUrl . '/invoice/status?apikey=' . urlencode($apiKey) . '&invoice_id=' . urlencode($invoiceId);
} else {
    sendError('Aksi tidak valid. Gunakan action=create atau action=status');
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
    sendError('cURL Error: ' . $curlError);
}

// Cek HTTP status
if ($httpCode !== 200) {
    sendError('HTTP Error: ' . $httpCode . ' - ' . $response);
}

// Parse JSON
$data = json_decode($response, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    sendError('Invalid JSON response: ' . substr($response, 0, 200));
}

// Kirim respons
echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
exit;

function sendError($message) {
    echo json_encode([
        'success' => false,
        'error' => $message,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT);
    exit;
}
?>
