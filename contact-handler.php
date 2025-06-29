<?php
/**
 * Contact Form Handler with Server-Side Validation and CSRF Protection
 * San Antonio Philatelic Association
 */

// Include security headers and CSRF token functions
require_once 'security-headers.php';
require_once 'csrf-token.php';

// Set JSON content type
header('Content-Type: application/json');

// Set CORS headers for contact form
setCORSHeaders();

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

// Get and decode JSON input
$input = json_decode(file_get_contents('php://input'), true);

// If not JSON, try form data
if (!$input) {
    $input = $_POST;
}

// Initialize response
$response = [
    'success' => false,
    'errors' => [],
    'message' => ''
];

// Server-side validation functions
function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

function validatePhone($phone) {
    // Remove common phone characters
    $cleaned = preg_replace('/[\s\-\(\)\.]+/', '', $phone);
    // Check if it's a valid US phone number (10 digits)
    return preg_match('/^[0-9]{10}$/', $cleaned);
}

// Rate limiting check
$clientIP = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
if (!checkRateLimit($clientIP, 3, 3600)) { // 3 submissions per hour
    $response['errors']['rate_limit'] = 'Too many submissions. Please wait before trying again.';
    logSecurityEvent('rate_limit_exceeded', 'Contact form rate limit exceeded', ['ip' => $clientIP]);
}

// Enhanced input safety validation
foreach ($input as $key => $value) {
    if (is_string($value) && !validateInputSafety($value)) {
        $response['errors']['security'] = 'Invalid input detected. Please check your submission.';
        logSecurityEvent('suspicious_input', 'Potentially malicious input detected', [
            'field' => $key,
            'value' => substr($value, 0, 100),
            'ip' => $clientIP
        ]);
        break;
    }
}

// CSRF Token Validation
if (empty($input['csrf_token'])) {
    $response['errors']['csrf'] = 'Security token missing. Please refresh the page and try again.';
} else {
    if (!validateCSRFToken($input['csrf_token'])) {
        $response['errors']['csrf'] = 'Invalid security token. Please refresh the page and try again.';
    }
}

// Validate required fields
$required_fields = ['name', 'email', 'subject', 'message'];
foreach ($required_fields as $field) {
    if (empty($input[$field])) {
        $response['errors'][$field] = ucfirst($field) . ' is required';
    }
}

// Validate and sanitize inputs
if (!empty($input['name'])) {
    $name = sanitizeInput($input['name'], 'text');
    if (strlen($name) < 2) {
        $response['errors']['name'] = 'Name must be at least 2 characters';
    } elseif (strlen($name) > 100) {
        $response['errors']['name'] = 'Name must not exceed 100 characters';
    }
} else {
    $name = '';
}

if (!empty($input['email'])) {
    $email = sanitizeInput($input['email'], 'email');
    if (!validateEmail($email)) {
        $response['errors']['email'] = 'Please provide a valid email address';
    }
} else {
    $email = '';
}

if (!empty($input['phone'])) {
    $phone = sanitizeInput($input['phone'], 'phone');
    if ($phone && !validatePhone($phone)) {
        $response['errors']['phone'] = 'Please provide a valid US phone number';
    }
} else {
    $phone = '';
}

if (!empty($input['subject'])) {
    $subject = sanitizeInput($input['subject'], 'text');
    if (strlen($subject) < 3) {
        $response['errors']['subject'] = 'Subject must be at least 3 characters';
    } elseif (strlen($subject) > 200) {
        $response['errors']['subject'] = 'Subject must not exceed 200 characters';
    }
} else {
    $subject = '';
}

if (!empty($input['message'])) {
    $message = sanitizeInput($input['message'], 'text');
    if (strlen($message) < 10) {
        $response['errors']['message'] = 'Message must be at least 10 characters';
    } elseif (strlen($message) > 5000) {
        $response['errors']['message'] = 'Message must not exceed 5000 characters';
    }
} else {
    $message = '';
}

// Check for spam patterns
$spam_patterns = [
    '/\b(viagra|cialis|casino|lottery|prize|winner)\b/i',
    '/\b(click here|buy now|limited offer)\b/i',
    '/<a\s+href/i',
    '/\[url\]/i'
];

$combined_text = $name . ' ' . $email . ' ' . $subject . ' ' . $message;
foreach ($spam_patterns as $pattern) {
    if (preg_match($pattern, $combined_text)) {
        $response['errors']['spam'] = 'Your message appears to contain spam content';
        break;
    }
}

// Rate limiting check (simple implementation)
session_start();
$session_key = 'contact_form_submissions';
$max_submissions = 3;
$time_window = 3600; // 1 hour

if (!isset($_SESSION[$session_key])) {
    $_SESSION[$session_key] = [];
}

// Clean old submissions
$_SESSION[$session_key] = array_filter($_SESSION[$session_key], function($timestamp) use ($time_window) {
    return time() - $timestamp < $time_window;
});

if (count($_SESSION[$session_key]) >= $max_submissions) {
    $response['errors']['rate_limit'] = 'Too many submissions. Please try again later.';
}

// If no errors, process the form
if (empty($response['errors'])) {
    // Add submission timestamp
    $_SESSION[$session_key][] = time();
    
    // Configure email settings
    $to = 'contact@sapa-stamps.org'; // Replace with actual email
    $email_subject = "[SAPA Contact Form] " . $subject;
    
    $email_body = "New contact form submission:\n\n";
    $email_body .= "Name: $name\n";
    $email_body .= "Email: $email\n";
    if ($phone) {
        $email_body .= "Phone: $phone\n";
    }
    $email_body .= "Subject: $subject\n\n";
    $email_body .= "Message:\n$message\n";
    $email_body .= "\n---\n";
    $email_body .= "Submitted on: " . date('Y-m-d H:i:s') . "\n";
    $email_body .= "IP Address: " . $_SERVER['REMOTE_ADDR'] . "\n";
    
    $headers = "From: noreply@sapa-stamps.org\r\n";
    $headers .= "Reply-To: $email\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion();
    
    // Send email
    if (mail($to, $email_subject, $email_body, $headers)) {
        $response['success'] = true;
        $response['message'] = 'Thank you for your message. We will respond as soon as possible.';
        
        // Log successful submission (optional)
        error_log("Contact form submitted successfully from: $email");
    } else {
        $response['errors']['server'] = 'Failed to send message. Please try again later.';
        error_log("Contact form email failed for: $email");
    }
}

// Send JSON response
http_response_code($response['success'] ? 200 : 400);
echo json_encode($response);
?>