<?php
/**
 * Contact Form Handler with Server-Side Validation and CSRF Protection
 * San Antonio Philatelic Association
 */

// Include CSRF token functions
require_once 'csrf-token.php';

// Security headers
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

// CORS configuration (adjust as needed)
$allowed_origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed_origins = ['https://yourdomain.com', 'http://localhost:8080'];

if (in_array($allowed_origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $allowed_origin");
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
}

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

function sanitizeInput($input) {
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
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
    $name = sanitizeInput($input['name']);
    if (strlen($name) < 2) {
        $response['errors']['name'] = 'Name must be at least 2 characters';
    } elseif (strlen($name) > 100) {
        $response['errors']['name'] = 'Name must not exceed 100 characters';
    }
} else {
    $name = '';
}

if (!empty($input['email'])) {
    $email = sanitizeInput($input['email']);
    if (!validateEmail($email)) {
        $response['errors']['email'] = 'Please provide a valid email address';
    }
} else {
    $email = '';
}

if (!empty($input['phone'])) {
    $phone = sanitizeInput($input['phone']);
    if ($phone && !validatePhone($phone)) {
        $response['errors']['phone'] = 'Please provide a valid US phone number';
    }
} else {
    $phone = '';
}

if (!empty($input['subject'])) {
    $subject = sanitizeInput($input['subject']);
    if (strlen($subject) < 3) {
        $response['errors']['subject'] = 'Subject must be at least 3 characters';
    } elseif (strlen($subject) > 200) {
        $response['errors']['subject'] = 'Subject must not exceed 200 characters';
    }
} else {
    $subject = '';
}

if (!empty($input['message'])) {
    $message = sanitizeInput($input['message']);
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