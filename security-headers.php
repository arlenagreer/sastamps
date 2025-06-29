<?php
/**
 * Security Headers Configuration
 * San Antonio Philatelic Association
 * 
 * Implements comprehensive security headers to protect against various attacks
 */

/**
 * Set comprehensive security headers
 */
function setSecurityHeaders() {
    // Content Security Policy (CSP)
    $cspDirectives = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://cdnjs.cloudflare.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
        "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com",
        "img-src 'self' data: https://www.google-analytics.com",
        "connect-src 'self' https://www.google-analytics.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests"
    ];
    
    header("Content-Security-Policy: " . implode('; ', $cspDirectives));
    
    // Additional security headers
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('X-XSS-Protection: 1; mode=block');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: geolocation=(), microphone=(), camera=()');
    
    // HSTS header (only for HTTPS)
    if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
        header('Strict-Transport-Security: max-age=31536000; includeSubDomains; preload');
    }
    
    // Remove server information
    header_remove('X-Powered-By');
    header_remove('Server');
}

/**
 * Set CORS headers for API endpoints
 * @param array $allowedOrigins - Array of allowed origins
 */
function setCORSHeaders($allowedOrigins = []) {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    
    // Default allowed origins for SAPA
    if (empty($allowedOrigins)) {
        $allowedOrigins = [
            'https://sastamps.org',
            'https://www.sastamps.org',
            'http://localhost:8080',
            'http://localhost:3000'
        ];
    }
    
    if (in_array($origin, $allowedOrigins)) {
        header("Access-Control-Allow-Origin: $origin");
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, X-Requested-With, Authorization');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Max-Age: 86400'); // 24 hours
    }
}

/**
 * Handle preflight OPTIONS requests
 */
function handlePreflightRequest() {
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        setCORSHeaders();
        http_response_code(200);
        exit();
    }
}

/**
 * Validate and sanitize input to prevent injection attacks
 * @param string $input - Input to sanitize
 * @param string $type - Type of sanitization (text, email, phone, html)
 * @return string - Sanitized input
 */
function sanitizeInput($input, $type = 'text') {
    // Remove null bytes and normalize line endings
    $input = str_replace(["\0", "\r"], '', $input);
    $input = trim($input);
    
    switch ($type) {
        case 'email':
            return filter_var($input, FILTER_SANITIZE_EMAIL);
            
        case 'phone':
            return preg_replace('/[^0-9+\-\(\)\s]/', '', $input);
            
        case 'html':
            return htmlspecialchars($input, ENT_QUOTES | ENT_HTML5, 'UTF-8');
            
        case 'text':
        default:
            // Remove potentially dangerous characters
            $input = preg_replace('/[<>"\']/', '', $input);
            return htmlspecialchars($input, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }
}

/**
 * Validate input against common injection patterns
 * @param string $input - Input to validate
 * @return bool - True if input appears safe
 */
function validateInputSafety($input) {
    // Check for common injection patterns
    $dangerousPatterns = [
        '/(<script|<\/script|javascript:|vbscript:|onload=|onerror=)/i',
        '/(union\s+select|drop\s+table|delete\s+from|insert\s+into)/i',
        '/(\||\&\&|\;|\$\(|\`)/i'
    ];
    
    foreach ($dangerousPatterns as $pattern) {
        if (preg_match($pattern, $input)) {
            return false;
        }
    }
    
    return true;
}

/**
 * Rate limiting check
 * @param string $identifier - IP address or user identifier
 * @param int $maxRequests - Maximum requests allowed
 * @param int $timeWindow - Time window in seconds
 * @return bool - True if request is allowed
 */
function checkRateLimit($identifier, $maxRequests = 5, $timeWindow = 3600) {
    $filename = sys_get_temp_dir() . '/rate_limit_' . md5($identifier);
    
    $now = time();
    $requests = [];
    
    // Load existing requests
    if (file_exists($filename)) {
        $data = file_get_contents($filename);
        $requests = json_decode($data, true) ?: [];
    }
    
    // Remove old requests
    $requests = array_filter($requests, function($timestamp) use ($now, $timeWindow) {
        return ($now - $timestamp) < $timeWindow;
    });
    
    // Check if limit exceeded
    if (count($requests) >= $maxRequests) {
        return false;
    }
    
    // Add current request
    $requests[] = $now;
    
    // Save updated requests
    file_put_contents($filename, json_encode($requests));
    
    return true;
}

/**
 * Log security events
 * @param string $event - Event type
 * @param string $message - Event message
 * @param array $context - Additional context
 */
function logSecurityEvent($event, $message, $context = []) {
    $logEntry = [
        'timestamp' => date('Y-m-d H:i:s'),
        'event' => $event,
        'message' => $message,
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
        'context' => $context
    ];
    
    $logFile = 'logs/security.log';
    $logDir = dirname($logFile);
    
    // Create logs directory if it doesn't exist
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    file_put_contents($logFile, json_encode($logEntry) . "\n", FILE_APPEND | LOCK_EX);
}

// Auto-apply security headers when this file is included
if (!headers_sent()) {
    setSecurityHeaders();
}
?>