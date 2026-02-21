<?php
/**
 * Bluesky Cross-post
 * Auto-posts new blog posts to Bluesky via AT Protocol.
 * Settings: WordPress Admin → Settings → Bluesky Cross-post
 */

// ----- Admin Settings Page -----

add_action('admin_menu', function () {
    add_options_page(
        'Bluesky Cross-post',
        'Bluesky Cross-post',
        'manage_options',
        'bluesky-crosspost',
        'bluesky_crosspost_settings_page'
    );
});

add_action('admin_init', function () {
    register_setting('bluesky_crosspost', 'bluesky_handle');
    register_setting('bluesky_crosspost', 'bluesky_app_password');
    register_setting('bluesky_crosspost', 'bluesky_enabled', ['default' => '1']);
    register_setting('bluesky_crosspost', 'bluesky_include_excerpt', ['default' => '1']);
    register_setting('bluesky_crosspost', 'bluesky_site_url');
});

function bluesky_crosspost_settings_page() {
    if (!current_user_can('manage_options')) return;
    $saved = isset($_GET['settings-updated']) ? '<div class="notice notice-success"><p>Settings saved.</p></div>' : '';
    ?>
    <div class="wrap">
        <h1>Bluesky Cross-post Settings</h1>
        <?php echo $saved; ?>
        <p>When you publish a new post, it will automatically be posted to Bluesky.</p>
        <p>Generate an App Password at <a href="https://bsky.app/settings/app-passwords" target="_blank">bsky.app → Settings → App Passwords</a>. Do not use your main password.</p>
        <form method="post" action="options.php">
            <?php settings_fields('bluesky_crosspost'); ?>
            <table class="form-table">
                <tr>
                    <th><label for="bluesky_enabled">Enabled</label></th>
                    <td><input type="checkbox" name="bluesky_enabled" id="bluesky_enabled" value="1" <?php checked(get_option('bluesky_enabled', '1'), '1'); ?> /></td>
                </tr>
                <tr>
                    <th><label for="bluesky_handle">Bluesky Handle</label></th>
                    <td>
                        <input type="text" name="bluesky_handle" id="bluesky_handle" value="<?php echo esc_attr(get_option('bluesky_handle')); ?>" class="regular-text" placeholder="you.bsky.social" />
                        <p class="description">Your Bluesky handle, e.g. <code>evepanzarino.bsky.social</code></p>
                    </td>
                </tr>
                <tr>
                    <th><label for="bluesky_app_password">App Password</label></th>
                    <td>
                        <input type="password" name="bluesky_app_password" id="bluesky_app_password" value="<?php echo esc_attr(get_option('bluesky_app_password')); ?>" class="regular-text" placeholder="xxxx-xxxx-xxxx-xxxx" />
                        <p class="description">App password from bsky.app → Settings → App Passwords</p>
                    </td>
                </tr>
                <tr>
                    <th><label for="bluesky_site_url">Blog URL (optional override)</label></th>
                    <td>
                        <input type="text" name="bluesky_site_url" id="bluesky_site_url" value="<?php echo esc_attr(get_option('bluesky_site_url')); ?>" class="regular-text" placeholder="https://evepanzarino.com/blog" />
                        <p class="description">Leave blank to use the WordPress Site URL. Set this if posts link to a different URL.</p>
                    </td>
                </tr>
                <tr>
                    <th><label for="bluesky_include_excerpt">Include excerpt</label></th>
                    <td>
                        <input type="checkbox" name="bluesky_include_excerpt" id="bluesky_include_excerpt" value="1" <?php checked(get_option('bluesky_include_excerpt', '1'), '1'); ?> />
                        <p class="description">Include the post excerpt (or first 200 characters) in the Bluesky post.</p>
                    </td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>
        <hr>
        <h2>Test</h2>
        <p>After saving settings, use the button below to send a test post to Bluesky.</p>
        <form method="post">
            <?php wp_nonce_field('bluesky_test'); ?>
            <input type="hidden" name="bluesky_test_action" value="1" />
            <?php submit_button('Send Test Post', 'secondary', 'bluesky_test_submit'); ?>
        </form>
        <?php
        if (isset($_POST['bluesky_test_action']) && check_admin_referer('bluesky_test')) {
            $result = bluesky_crosspost_send_test();
            if (is_wp_error($result)) {
                echo '<div class="notice notice-error"><p>Test failed: ' . esc_html($result->get_error_message()) . '</p></div>';
            } else {
                echo '<div class="notice notice-success"><p>Test post sent! URI: ' . esc_html($result) . '</p></div>';
            }
        }
        ?>
    </div>
    <?php
}

// ----- Core: Authenticate + Post to Bluesky -----

function bluesky_create_session($handle, $app_password) {
    $response = wp_remote_post('https://bsky.social/xrpc/com.atproto.server.createSession', [
        'headers' => ['Content-Type' => 'application/json'],
        'body'    => json_encode(['identifier' => $handle, 'password' => $app_password]),
        'timeout' => 15,
    ]);
    if (is_wp_error($response)) return $response;
    $body = json_decode(wp_remote_retrieve_body($response), true);
    if (empty($body['accessJwt'])) {
        $msg = $body['message'] ?? 'Unknown error from Bluesky auth';
        return new WP_Error('bluesky_auth', $msg);
    }
    return $body; // ['accessJwt', 'did', ...]
}

function bluesky_create_post($access_jwt, $did, $text, $facets = [], $embed = null) {
    $record = [
        '$type'     => 'app.bsky.feed.post',
        'text'      => $text,
        'createdAt' => gmdate('Y-m-d\TH:i:s\Z'),
    ];
    if (!empty($facets))  $record['facets'] = $facets;
    if (!empty($embed))   $record['embed']  = $embed;

    $response = wp_remote_post('https://bsky.social/xrpc/com.atproto.repo.createRecord', [
        'headers' => [
            'Content-Type'  => 'application/json',
            'Authorization' => 'Bearer ' . $access_jwt,
        ],
        'body'    => json_encode([
            'repo'       => $did,
            'collection' => 'app.bsky.feed.post',
            'record'     => $record,
        ]),
        'timeout' => 15,
    ]);
    if (is_wp_error($response)) return $response;
    $body = json_decode(wp_remote_retrieve_body($response), true);
    if (empty($body['uri'])) {
        $msg = $body['message'] ?? 'Unknown error creating Bluesky post';
        return new WP_Error('bluesky_post', $msg);
    }
    return $body['uri'];
}

/**
 * Build the post text + facets (link card) for a given WP post.
 */
function bluesky_build_post_content($post) {
    $include_excerpt = get_option('bluesky_include_excerpt', '1');
    $base_url        = rtrim(get_option('bluesky_site_url') ?: get_option('siteurl'), '/');
    $post_url        = $base_url . '/?p=' . $post->ID;

    // Try to get the real permalink (relative path stripped of base)
    $permalink = get_permalink($post->ID);
    if ($permalink) $post_url = $permalink;

    $title = html_entity_decode(get_the_title($post->ID), ENT_QUOTES, 'UTF-8');

    $excerpt = '';
    if ($include_excerpt === '1') {
        $raw = $post->post_excerpt ?: wp_trim_words(strip_tags($post->post_content), 30, '');
        $excerpt = html_entity_decode($raw, ENT_QUOTES, 'UTF-8');
    }

    // Bluesky posts: 300 grapheme limit. Reserve space for "\n\n" + actual URL length.
    $url_len  = mb_strlen($post_url);
    $max_body = 300 - 2 - $url_len; // 300 - "\n\n" - url
    $body = mb_substr($title, 0, $max_body);
    if ($excerpt && mb_strlen($title) < $max_body) {
        $candidate = $title . "\n\n" . $excerpt;
        if (mb_strlen($candidate) <= $max_body) {
            $body = $candidate;
        } else {
            $available = $max_body - mb_strlen($title) - 2;
            if ($available > 10) {
                $body = $title . "\n\n" . mb_substr($excerpt, 0, $available - 1) . '…';
            }
        }
    }

    $text       = $body . "\n\n" . $post_url;
    $url_start  = mb_strlen($body . "\n\n");
    $url_bytes  = strlen($post_url); // facets use byte offsets

    // Compute byte offset (UTF-8 aware)
    $body_bytes = strlen($body . "\n\n");
    $facets = [[
        'index' => [
            'byteStart' => $body_bytes,
            'byteEnd'   => $body_bytes + $url_bytes,
        ],
        'features' => [[
            '$type' => 'app.bsky.richtext.facet#link',
            'uri'   => $post_url,
        ]],
    ]];

    return [$text, $facets, $post_url];
}

// ----- Image upload to Bluesky -----

function bluesky_upload_image($access_jwt, $image_url) {
    $dl = wp_remote_get($image_url, ['timeout' => 30]);
    if (is_wp_error($dl)) return $dl;

    $image_data = wp_remote_retrieve_body($dl);
    $mime       = wp_remote_retrieve_header($dl, 'content-type') ?: 'image/jpeg';
    $mime       = strtok($mime, ';'); // strip charset if present

    $response = wp_remote_post('https://bsky.social/xrpc/com.atproto.repo.uploadBlob', [
        'headers' => [
            'Content-Type'  => $mime,
            'Authorization' => 'Bearer ' . $access_jwt,
        ],
        'body'    => $image_data,
        'timeout' => 30,
    ]);
    if (is_wp_error($response)) return $response;

    $body = json_decode(wp_remote_retrieve_body($response), true);
    if (empty($body['blob'])) {
        return new WP_Error('bluesky_blob', $body['message'] ?? 'Failed to upload image to Bluesky');
    }
    return $body['blob'];
}

// ----- Hook: fire on publish -----

add_action('wp_after_insert_post', function ($post_id, $post, $update, $post_before) {
    if ($post->post_status !== 'publish') return;
    if ($post_before && $post_before->post_status === 'publish') return;
    if ($post->post_type !== 'post') return;
    if (get_option('bluesky_enabled', '1') !== '1') return;

    $handle       = get_option('bluesky_handle');
    $app_password = get_option('bluesky_app_password');
    if (!$handle || !$app_password) return;

    $session = bluesky_create_session($handle, $app_password);
    if (is_wp_error($session)) {
        error_log('[Bluesky] Auth failed: ' . $session->get_error_message());
        return;
    }

    [$text, $facets, $url] = bluesky_build_post_content($post);

    // Attach featured image if present
    $embed     = null;
    $thumb_id  = get_post_thumbnail_id($post->ID);
    if ($thumb_id) {
        $image_url = wp_get_attachment_url($thumb_id);
        if ($image_url) {
            $blob = bluesky_upload_image($session['accessJwt'], $image_url);
            if (!is_wp_error($blob)) {
                $title = html_entity_decode(get_the_title($post->ID), ENT_QUOTES, 'UTF-8');
                $embed = [
                    '$type'  => 'app.bsky.embed.images',
                    'images' => [[
                        'image' => $blob,
                        'alt'   => $title,
                    ]],
                ];
            } else {
                error_log('[Bluesky] Image upload failed: ' . $blob->get_error_message());
            }
        }
    }

    $result = bluesky_create_post($session['accessJwt'], $session['did'], $text, $facets, $embed);
    if (is_wp_error($result)) {
        error_log('[Bluesky] Post failed: ' . $result->get_error_message());
    } else {
        error_log('[Bluesky] Posted: ' . $result);
        update_post_meta($post->ID, '_bluesky_uri', $result);
    }
}, 10, 4);

// ----- Test helper -----

function bluesky_crosspost_send_test() {
    $handle       = get_option('bluesky_handle');
    $app_password = get_option('bluesky_app_password');
    if (!$handle || !$app_password) {
        return new WP_Error('bluesky_config', 'Handle and App Password must be set first.');
    }

    $session = bluesky_create_session($handle, $app_password);
    if (is_wp_error($session)) return $session;

    $test_url  = rtrim(get_option('bluesky_site_url') ?: get_option('siteurl'), '/');
    $text      = "Test post from my blog at " . $test_url . " — Bluesky cross-posting is working! 🎉";
    $url_start = strlen("Test post from my blog at ");
    $url_end   = $url_start + strlen($test_url);
    $facets    = [[
        'index'    => ['byteStart' => $url_start, 'byteEnd' => $url_end],
        'features' => [['$type' => 'app.bsky.richtext.facet#link', 'uri' => $test_url]],
    ]];

    return bluesky_create_post($session['accessJwt'], $session['did'], $text, $facets);
}
