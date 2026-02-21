<?php
define( 'DB_NAME', 'dev-blog' );
define( 'DB_USER', 'evepanzarino' );
define( 'DB_PASSWORD', 'TrueLove25320664!' );
define( 'DB_HOST', 'mysql' );
define( 'DB_CHARSET', 'utf8mb4' );
define( 'DB_COLLATE', '' );
$table_prefix = 'wp_';
define( 'WP_DEBUG', false );
if ( ! defined( 'ABSPATH' ) ) {
    define( 'ABSPATH', __DIR__ . '/' );
}
require_once ABSPATH . 'wp-settings.php';
