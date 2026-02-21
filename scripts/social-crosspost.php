<?php
/**
 * Social Cross-post
 * Auto-posts new blog posts to Facebook Page and Instagram Business account.
 * Settings: WordPress Admin → Settings → Social Cross-post
 *
 * Requirements:
 *  - Facebook Page Access Token with permissions:
 *    pages_manage_posts, pages_read_engagement, pages_show_list,
 *    instagram_basic, instagram_content_publish
 *  - Instagram Business/Creator account linked to your Facebook Page
 *  - Posts must have a Featured Image to cross-post to Instagram
 */

// ----- Admin Settings Page -----

add_action('admin_menu', function () {
    add_options_page(
        'Social Cross-post',
        'Social Cross-post',
        'manage_options',
        'social-crosspost',
        'social_crosspost_settings_page'
    );
});

add_action('admin_init', function () {
    register_setting('social_crosspost', 'scp_page_id');
    register_setting('social_crosspost', 'scp_page_token');
    register_setting('social_crosspost', 'scp_ig_user_id');
    register_setting('social_crosspost', 'scp_facebook_enabled',  ['default' => '1']);
    register_setting('social_crosspost', 'scp_instagram_enabled', ['default' => '1']);
    register_setting('social_crosspost', 'scp_include_excerpt',   ['default' => '1']);
    register_setting('social_crosspost', 'scp_site_url');
});

function social_crosspost_settings_page() {
    if (!current_user_can('manage_options')) return;

    // Auto-fetch Instagram user ID when page token + page ID are present
    $ig_note = '';
    if (get_option('scp_page_token') && get_option('scp_page_id') && !get_option('scp_ig_user_id')) {
        $ig_id = social_crosspost_fetch_ig_user_id(get_option('scp_page_id'), get_option('scp_page_token'));
        if (!is_wp_error($ig_id)) {
            update_option('scp_ig_user_id', $ig_id);
            $ig_note = '<div class="notice notice-success"><p>Instagram account auto-detected: ' . esc_html($ig_id) . '</p></div>';
        }
    }

    $saved = isset($_GET['settings-updated']) ? '<div class="notice notice-success"><p>Settings saved.</p></div>' : '';
    ?>
    <div class="wrap">
        <h1>Social Cross-post Settings</h1>
        <?php echo $saved . $ig_note; ?>
        <p>Automatically posts to Facebook and Instagram when you publish a new blog post.</p>
        <p><strong>Required token permissions:</strong> <code>pages_manage_posts</code>, <code>pages_read_engagement</code>, <code>pages_show_list</code>, <code>instagram_basic</code>, <code>instagram_content_publish</code></p>
        <p>Generate a Page Access Token at <a href="https://developers.facebook.com/tools/explorer" target="_blank">Graph API Explorer</a> with those permissions, then extend it to 60 days via the Access Token Debugger.</p>

        <form method="post" action="options.php">
            <?php settings_fields('social_crosspost'); ?>
            <h2>Facebook</h2>
            <table class="form-table">
                <tr>
                    <th><label for="scp_facebook_enabled">Post to Facebook</label></th>
                    <td><input type="checkbox" name="scp_facebook_enabled" id="scp_facebook_enabled" value="1" <?php checked(get_option('scp_facebook_enabled', '1'), '1'); ?> /></td>
                </tr>
                <tr>
                    <th><label for="scp_page_id">Page ID</label></th>
                    <td>
                        <input type="text" name="scp_page_id" id="scp_page_id" value="<?php echo esc_attr(get_option('scp_page_id')); ?>" class="regular-text" />
                        <p class="description">Your Facebook Page ID (e.g. <code>735892086268059</code>)</p>
                    </td>
                </tr>
                <tr>
                    <th><label for="scp_page_token">Page Access Token</label></th>
                    <td>
                        <input type="password" name="scp_page_token" id="scp_page_token" value="<?php echo esc_attr(get_option('scp_page_token')); ?>" class="large-text" />
                    </td>
                </tr>
            </table>

            <h2>Instagram</h2>
            <table class="form-table">
                <tr>
                    <th><label for="scp_instagram_enabled">Post to Instagram</label></th>
                    <td>
                        <input type="checkbox" name="scp_instagram_enabled" id="scp_instagram_enabled" value="1" <?php checked(get_option('scp_instagram_enabled', '1'), '1'); ?> />
                        <p class="description">Posts only when the blog post has a Featured Image set. Instagram requires an image.</p>
                    </td>
                </tr>
                <tr>
                    <th><label for="scp_ig_user_id">Instagram Business Account ID</label></th>
                    <td>
                        <input type="text" name="scp_ig_user_id" id="scp_ig_user_id" value="<?php echo esc_attr(get_option('scp_ig_user_id')); ?>" class="regular-text" />
                        <p class="description">Auto-filled when your Page Token has <code>instagram_basic</code> permission. Or enter manually.</p>
                    </td>
                </tr>
            </table>

            <h2>General</h2>
            <table class="form-table">
                <tr>
                    <th><label for="scp_include_excerpt">Include excerpt</label></th>
                    <td>
                        <input type="checkbox" name="scp_include_excerpt" id="scp_include_excerpt" value="1" <?php checked(get_option('scp_include_excerpt', '1'), '1'); ?> />
                    </td>
                </tr>
                <tr>
                    <th><label for="scp_site_url">Blog URL override</label></th>
                    <td>
                        <input type="text" name="scp_site_url" id="scp_site_url" value="<?php echo esc_attr(get_option('scp_site_url')); ?>" class="regular-text" placeholder="https://evepanzarino.com/blog" />
                        <p class="description">Leave blank to use the WordPress Site URL.</p>
                    </td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>

        <hr>
        <h2>Auto-detect Instagram Account</h2>
        <form method="post">
            <?php wp_nonce_field('scp_detect_ig'); ?>
            <input type="hidden" name="scp_detect_ig_action" value="1" />
            <?php submit_button('Detect Instagram Account ID', 'secondary', 'scp_detect_ig_submit'); ?>
        </form>
        <?php
        if (isset($_POST['scp_detect_ig_action']) && check_admin_referer('scp_detect_ig')) {
            $ig_id = social_crosspost_fetch_ig_user_id(get_option('scp_page_id'), get_option('scp_page_token'));
            if (is_wp_error($ig_id)) {
                echo '<div class="notice notice-error"><p>' . esc_html($ig_id->get_error_message()) . '</p></div>';
            } else {
                update_option('scp_ig_user_id', $ig_id);
                echo '<div class="notice notice-success"><p>Instagram account detected and saved: <strong>' . esc_html($ig_id) . '</strong></p></div>';
            }
        }
        ?>

        <hr>
        <h2>Test</h2>
        <form method="post">
            <?php wp_nonce_field('scp_test'); ?>
            <input type="hidden" name="scp_test_action" value="1" />
            <?php submit_button('Send Test Posts', 'secondary', 'scp_test_submit'); ?>
        </form>
        <?php
        if (isset($_POST['scp_test_action']) && check_admin_referer('scp_test')) {
            echo '<h3>Test Results</h3><ul>';

            if (get_option('scp_facebook_enabled') === '1') {
                $r = social_crosspost_facebook_post(
                    get_option('scp_page_id'),
                    get_option('scp_page_token'),
                    'Test post from my blog — Facebook cross-posting is working!',
                    rtrim(get_option('scp_site_url') ?: get_option('siteurl'), '/')
                );
                if (is_wp_error($r)) {
                    echo '<li>❌ Facebook: ' . esc_html($r->get_error_message()) . '</li>';
                } else {
                    echo '<li>✅ Facebook: Post ID ' . esc_html($r) . '</li>';
                }
            }

            if (get_option('scp_instagram_enabled') === '1') {
                echo '<li>ℹ️ Instagram: Skipped in test (requires a real post with a featured image URL)</li>';
            }

            echo '</ul>';
        }
        ?>
    </div>
    <?php
}

// ----- Facebook -----

function social_crosspost_facebook_post($page_id, $page_token, $message, $link = '', $image_url = '') {
    if (!$page_id || !$page_token) return new WP_Error('scp_config', 'Facebook Page ID and Token not configured.');

    // If we have an image, post as a photo (image shows inline, not just as link preview)
    if ($image_url) {
        $response = wp_remote_post("https://graph.facebook.com/v21.0/{$page_id}/photos", [
            'body'    => [
                'url'          => $image_url,
                'caption'      => $message,
                'access_token' => $page_token,
            ],
            'timeout' => 30,
        ]);
        if (is_wp_error($response)) return $response;
        $data = json_decode(wp_remote_retrieve_body($response), true);
        if (!empty($data['id'])) return $data['id'];
        // Fall through to regular post if photo upload fails
        error_log('[SCP] Facebook photo post failed, falling back to link post: ' . ($data['error']['message'] ?? 'unknown'));
    }

    // Regular link post (no image, or photo upload failed)
    $body = ['message' => $message, 'access_token' => $page_token];
    if ($link) $body['link'] = $link;

    $response = wp_remote_post("https://graph.facebook.com/v21.0/{$page_id}/feed", [
        'body'    => $body,
        'timeout' => 20,
    ]);
    if (is_wp_error($response)) return $response;

    $data = json_decode(wp_remote_retrieve_body($response), true);
    if (!empty($data['id'])) return $data['id'];

    return new WP_Error('scp_fb', $data['error']['message'] ?? 'Unknown Facebook API error');
}

// ----- Instagram -----

function social_crosspost_fetch_ig_user_id($page_id, $page_token) {
    $response = wp_remote_get("https://graph.facebook.com/v21.0/{$page_id}?fields=instagram_business_account&access_token={$page_token}", [
        'timeout' => 15,
    ]);
    if (is_wp_error($response)) return $response;

    $data = json_decode(wp_remote_retrieve_body($response), true);
    if (!empty($data['instagram_business_account']['id'])) {
        return $data['instagram_business_account']['id'];
    }

    $msg = $data['error']['message'] ?? 'No Instagram Business account linked to this Page, or missing instagram_basic permission.';
    return new WP_Error('scp_ig', $msg);
}

function social_crosspost_instagram_post($ig_user_id, $page_token, $image_url, $caption) {
    if (!$ig_user_id || !$page_token) return new WP_Error('scp_config', 'Instagram account ID or token not configured.');

    // Step 1: Create media container
    $container = wp_remote_post("https://graph.facebook.com/v21.0/{$ig_user_id}/media", [
        'body'    => ['image_url' => $image_url, 'caption' => $caption, 'access_token' => $page_token],
        'timeout' => 30,
    ]);
    if (is_wp_error($container)) return $container;

    $container_data = json_decode(wp_remote_retrieve_body($container), true);
    if (empty($container_data['id'])) {
        return new WP_Error('scp_ig', $container_data['error']['message'] ?? 'Failed to create Instagram media container');
    }

    // Brief wait for container to be ready
    sleep(2);

    // Step 2: Publish
    $publish = wp_remote_post("https://graph.facebook.com/v21.0/{$ig_user_id}/media_publish", [
        'body'    => ['creation_id' => $container_data['id'], 'access_token' => $page_token],
        'timeout' => 30,
    ]);
    if (is_wp_error($publish)) return $publish;

    $publish_data = json_decode(wp_remote_retrieve_body($publish), true);
    if (!empty($publish_data['id'])) return $publish_data['id'];

    return new WP_Error('scp_ig', $publish_data['error']['message'] ?? 'Failed to publish Instagram post');
}

// ----- Build content -----

function social_crosspost_build_content($post) {
    $include_excerpt = get_option('scp_include_excerpt', '1');
    $base_url  = rtrim(get_option('scp_site_url') ?: get_option('siteurl'), '/');
    $permalink = get_permalink($post->ID) ?: $base_url . '/?p=' . $post->ID;
    $title     = html_entity_decode(get_the_title($post->ID), ENT_QUOTES, 'UTF-8');

    $excerpt = '';
    if ($include_excerpt === '1') {
        $raw     = $post->post_excerpt ?: wp_trim_words(strip_tags($post->post_content), 40, '');
        $excerpt = html_entity_decode($raw, ENT_QUOTES, 'UTF-8');
    }

    $message = $title;
    if ($excerpt) $message .= "\n\n" . $excerpt;
    $message .= "\n\n" . $permalink;

    return [$message, $permalink];
}

// ----- Hook: fire on publish -----

add_action('wp_after_insert_post', function ($post_id, $post, $update, $post_before) {
    if ($post->post_status !== 'publish') return;
    if ($post_before && $post_before->post_status === 'publish') return;
    if ($post->post_type !== 'post') return;

    [$message, $permalink] = social_crosspost_build_content($post);

    $page_id    = get_option('scp_page_id');
    $page_token = get_option('scp_page_token');

    // Get featured image URL (shared by Facebook + Instagram)
    $thumb_id  = get_post_thumbnail_id($post->ID);
    $image_url = $thumb_id ? wp_get_attachment_url($thumb_id) : '';

    // Facebook
    if (get_option('scp_facebook_enabled', '1') === '1') {
        $result = social_crosspost_facebook_post($page_id, $page_token, $message, $permalink, $image_url);
        if (is_wp_error($result)) {
            error_log('[SCP] Facebook failed: ' . $result->get_error_message());
        } else {
            error_log('[SCP] Facebook posted: ' . $result);
            update_post_meta($post->ID, '_scp_facebook_id', $result);
        }
    }

    // Instagram — only if there's a featured image
    if (get_option('scp_instagram_enabled', '1') === '1') {
        $ig_user_id  = get_option('scp_ig_user_id');

        if ($ig_user_id && $image_url) {
            $title   = html_entity_decode(get_the_title($post->ID), ENT_QUOTES, 'UTF-8');
            $excerpt = $post->post_excerpt ?: wp_trim_words(strip_tags($post->post_content), 40, '');
            $excerpt = html_entity_decode($excerpt, ENT_QUOTES, 'UTF-8');
            $caption = $title . ($excerpt ? "\n\n" . $excerpt : '') . "\n\n" . $permalink;

            $result = social_crosspost_instagram_post($ig_user_id, $page_token, $image_url, $caption);
            if (is_wp_error($result)) {
                error_log('[SCP] Instagram failed: ' . $result->get_error_message());
            } else {
                error_log('[SCP] Instagram posted: ' . $result);
                update_post_meta($post->ID, '_scp_instagram_id', $result);
            }
        } elseif (!$ig_user_id) {
            error_log('[SCP] Instagram skipped: Instagram account ID not configured.');
        } else {
            error_log('[SCP] Instagram skipped: post ' . $post->ID . ' has no featured image.');
        }
    }
}, 10, 4);
