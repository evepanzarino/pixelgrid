<?php
$_SERVER["HTTPS"] = "on";
define("WP_HOME", "https://evepanzarino.com/dev-blog");
define("WP_SITEURL", "https://evepanzarino.com/dev-blog");

define("DB_NAME", "dev-blog");
define("DB_USER", "evepanzarino");
define("DB_PASSWORD", "TrueLove25320664!");
define("DB_HOST", "mysql");
define("DB_CHARSET", "utf8mb4");
define("DB_COLLATE", "");

$table_prefix = "wp_";

define("AUTH_KEY", "aB1cD2eF3gH4iJ5");
define("SECURE_AUTH_KEY", "kL6mN7oP8qR9sT0");
define("LOGGED_IN_KEY", "uV1wX2yZ3aB4cD5");
define("NONCE_KEY", "eF6gH7iJ8kL9mN0");
define("AUTH_SALT", "oP1qR2sT3uV4wX5");
define("SECURE_AUTH_SALT", "yZ6aB7cD8eF9gH0");
define("LOGGED_IN_SALT", "iJ1kL2mN3oP4qR5");
define("NONCE_SALT", "sT6uV7wX8yZ9aB0");

define("WP_DEBUG", false);

if (!defined("ABSPATH")) {
    define("ABSPATH", __DIR__ . "/");
}
require_once ABSPATH . "wp-settings.php";
