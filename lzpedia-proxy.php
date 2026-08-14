<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$apiKey = 'LXZ_015d8a759df64d48';
$baseUrl = 'https://app.lzpedia.my.id/api';

$action = isset($_GET['action']) ? $_GET['action'] : '';
$amount = isset($_GET['amount']) ? (int)$_GET['amount'] : 0;
$invoiceId = isset($_GET['invoice_id']) ? $_GET['invoice_id'] : '';

if ($action === 'create') {
    $url = $baseUrl . '/invoice?apikey=' . $apiKey . '&amount=' . $amount;
} elseif ($action === 'status') {
    $url = $baseUrl . '/invoice/status?apikey=' . $apiKey . '&invoice_id=' . $invoiceId;
} else {
    echo json_encode(['success' => false, 'error' => 'Invalid action']);
    exit;
}

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200) {
    echo $response;
} else {
    echo json_encode(['success' => false, 'error' => 'HTTP ' . $httpCode]);
}
?>
