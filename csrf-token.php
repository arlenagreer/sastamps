<?php
/**
 * CSRF Token Generation and Validation
 * San Antonio Philatelic Association
 */

// Start session for CSRF tokens
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

/**
 * Generate a new CSRF token
 * @return string The generated token
 */
function generateCSRFToken() {
    $token = bin2hex(random_bytes(32));
    $_SESSION['csrf_token'] = $token;
    $_SESSION['csrf_token_time'] = time();
    return $token;
}

/**
 * Validate CSRF token
 * @param string $token The token to validate
 * @return bool True if valid, false otherwise
 */
function validateCSRFToken($token) {
    // Check if session has token
    if (!isset($_SESSION['csrf_token']) || !isset($_SESSION['csrf_token_time'])) {
        return false;
    }
    
    // Check token age (expire after 1 hour)
    $token_age = time() - $_SESSION['csrf_token_time'];
    if ($token_age > 3600) {
        unset($_SESSION['csrf_token']);
        unset($_SESSION['csrf_token_time']);
        return false;
    }
    
    // Validate token
    $valid = hash_equals($_SESSION['csrf_token'], $token);
    
    // Clear token after use (one-time use)
    if ($valid) {
        unset($_SESSION['csrf_token']);
        unset($_SESSION['csrf_token_time']);
    }
    
    return $valid;
}

/**
 * Get current CSRF token for forms
 * @return string Current token or new token if none exists
 */
function getCSRFToken() {
    if (!isset($_SESSION['csrf_token']) || !isset($_SESSION['csrf_token_time'])) {
        return generateCSRFToken();
    }
    
    // Check if token is expired
    $token_age = time() - $_SESSION['csrf_token_time'];
    if ($token_age > 3600) {
        return generateCSRFToken();
    }
    
    return $_SESSION['csrf_token'];
}

// If this file is called directly, return a JSON response with token
if (basename($_SERVER['SCRIPT_NAME']) === 'csrf-token.php') {
    header('Content-Type: application/json');
    
    // Only allow GET requests for token retrieval
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        exit();
    }
    
    $token = getCSRFToken();
    echo json_encode(['csrf_token' => $token]);
    exit();
}
?>