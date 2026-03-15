<?php
/**
 * Shared Backend for Form Processing
 * Focus on Security: Sanitization and Validation
 */

// Basic security check: headers to avoid cross-domain issues if needed
header("Content-Type: application/json; charset=UTF-8");

// Response structure
$response = [
    "success" => false,
    "message" => "Ocurrió un error inesperado.",
    "errors" => []
];

// Check if request is POST
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    
    // 1. COLLECT AND SANITIZE INPUTS
    // We use filter_var to clean inputs. Never trust $_POST directly!
    $name    = isset($_POST['name']) ? filter_var(trim($_POST['name']), FILTER_SANITIZE_SPECIAL_CHARS) : '';
    $email   = isset($_POST['email']) ? filter_var(trim($_POST['email']), FILTER_SANITIZE_EMAIL) : '';
    $message = isset($_POST['message']) ? filter_var(trim($_POST['message']), FILTER_SANITIZE_SPECIAL_CHARS) : '';
    $style   = isset($_POST['style']) ? filter_var(trim($_POST['style']), FILTER_SANITIZE_SPECIAL_CHARS) : 'unknown';

    // 2. VALIDATION
    if (empty($name)) {
        $response['errors'][] = "El nombre es obligatorio.";
    }
    
    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $response['errors'][] = "El correo electrónico no es válido.";
    }
    
    if (empty($message)) {
        $response['errors'][] = "El mensaje no puede estar vacío.";
    }

    // 3. FINAL PROCESSING
    if (empty($response['errors'])) {
        // Here you would typically send an email or save to a database.
        // For practice, we will simulate success.
        
        $response['success'] = true;
        $response['message'] = "¡Gracias, $name! Tu mensaje desde el estilo '$style' ha sido 'procesado' con éxito (Práctica PHP).";
    } else {
        $response['message'] = "Hay errores en el formulario.";
    }
} else {
    $response['message'] = "Método no permitido.";
}

// Return response as JSON
echo json_encode($response);
exit;
