<?php
$_SERVER["HTTPS"] = "on";
define("WP_HOME", "https://evepanzarino.com/blog");
define("WP_SITEURL", "https://evepanzarino.com/blog");

define("DB_NAME", "blog");
define("DB_USER", "evepanzarino");
define("DB_PASSWORD", "TrueLove25320664!");
define("DB_HOST", "mysql");
define("DB_CHARSET", "utf8mb4");
define("DB_COLLATE", "");

$table_prefix = "wp_";

define("AUTH_KEY", "xK9mP2vL5nQ8zYa");
define("SECURE_AUTH_KEY", "jR4hT7wE1yU6bCd");
define("LOGGED_IN_KEY", "cB3fG6dS9aZ2eRt");
define("NONCE_KEY", "oI8lM5kN4pW7qXs");
define("AUTH_SALT", "qX1tY4uV7zO0wNm");
define("SECURE_AUTH_SALT", "eA6rD9sF2gH5jKl");
define("LOGGED_IN_SALT", "bJ3cK8vL1wM4nPo");
define("NONCE_SALT", "nP7mQ0xR3yS6tUi");

define("WP_DEBUG", false);

if (!defined("ABSPATH")) {
    define("ABSPATH", __DIR__ . "/");
}
require_once ABSPATH . "wp-settings.php";
