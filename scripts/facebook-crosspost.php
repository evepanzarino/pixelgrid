<?php
/**
 * Facebook Cross-post
 * Auto-posts new blog posts to a Facebook Page via Graph API.
 * Settings: WordPress Admin → Settings → Facebook Cross-post
 */

// ----- Admin Settings Page -----

add_action('admin_menu', function () {
    add_options_page(
        'Facebook Cross-post',
        'Facebook Cross-post',
        'manage_options',
        'facebook-crosspost',
        'facebook_crosspost_settings_page'
    );
});

add_action('admin_init', function () {
    register_setting('facebook_crosspost', 'facebook_page_id');
    register_setting('facebook_crosspost', 'facebook_page_token');
    register_setting('facebook_crosspost', 'facebook_enabled', ['default' => '1']);
    register_setting('facebook_crosspost', 'facebook_include_excerpt', ['default' => '1']);
    register_setting('facebook_crosspost', 'facebook_site_url');
});

function facebook_crosspost_settings_page() {
    if (!current_user_can('manage_options')) return;
    $saved = isset($_GET['settings-updated']) ? '<div class="notice notice-success"><p>Settings saved.</p></div>' : '';
    ?>
    <div class="wrap">
        <h1>Facebook Cross-post Settings</h1>
        <?php echo $saved; ?>
        <p>When you publish a new post, it will automatically be posted to your Facebook Page.</p>
        <form method="post" action="options.php">
            <?php settings_fields('facebook_crosspost'); ?>
            <table class="form-table">
                <tr>
                    <th><label for="facebook_enabled">Enabled</label></th>
                    <td><input type="checkbox" name="facebook_enabled" id="facebook_enabled" value="1" <?php checked(get_option('facebook_enabled', '1'), '1'); ?> /></td>
                </tr>
                <tr>
                    <th><label for="facebook_page_id">Page ID</label></th>
                    <td>
                        <input type="text" name="facebook_page_id" id="facebook_page_id" value="<?php echo esc_attr(get_option('facebook_page_id')); ?>" class="regular-text" />
                    </td>
                </tr>
                <tr>
                    <th><label for="facebook_page_token">Page Access Token</label></th>
                    <td>
                        <input type="password" name="facebook_page_token" id="facebook_page_token" value="<?php echo esc_attr(get_option('facebook_page_token')); ?>" class="large-text" />
                        <p class="description">Page-specific access token from the Graph API Explorer.</p>
                    </td>
                </tr>
                <tr>
                    <th><label for="facebook_site_url">Blog URL (optional override)</label></th>
                    <td>
                        <input type="text" name="facebook_site_url" id="facebook_site_url" value="<?php echo esc_attr(get_option('facebook_site_url')); ?>" class="regular-text" placeholder="https://evepanzarino.com/blog" />
                        <p class="description">Leave blank to use the WordPress Site URL.</p>
                    </td>
                </tr>
                <tr>
                    <th><label for="facebook_include_excerpt">Include excerpt</label></th>
                    <td>
                        <input type="checkbox" name="facebook_include_excerpt" id="facebook_include_excerpt" value="1" <?php checked(get_option('facebook_include_excerpt', '1'), '1'); ?> />
                        <p class="description">Include the post excerpt in the Facebook post message.</p>
                    </td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>
        <hr>
        <h2>Test</h2>
        <form method="post">
            <?php wp_nonce_field('facebook_test'); ?>
            <input type="hidden" name="facebook_test_action" value="1" />
            <?php submit_button('Send Test Post', 'secondary', 'facebook_test_submit'); ?>
        </form>
        <?php
        if (isset($_POST['facebook_test_action']) && check_admin_referer('facebook_test')) {
            $result = facebook_crosspost_send_test();
            if (is_wp_error($result)) {
                echo '<div class="notice notice-error"><p>Test failed: ' . esc_html($result->get_error_message()) . '</p></div>';
            } else {
                echo '<div class="notice notice-success"><p>Test post sent! Post ID: ' . esc_html($result) . '</p></div>';
            }
        }
        ?>
    </div>
    <?php
}

// ----- Core: Post to Facebook Page -----

function facebook_post_to_page($page_id, $page_token, $message, $link = '') {
    $body = ['message' => $message, 'access_token' => $page_token];
    if ($link) $body['link'] = $link;

    $response = wp_remote_post("https://graph.facebook.com/v21.0/{$page_id}/feed", [
        'body'    => $body,
        'timeout' => 20,
    ]);

    if (is_wp_error($response)) return $response;

    $data = json_decode(wp_remote_retrieve_body($response), true);
    if (!empty($data['id'])) return $data['id'];

    $msg = $data['error']['message'] ?? 'Unknown error from Facebook API';
    return new WP_Error('facebook_post', $msg);
}

function facebook_build_message($post) {
    $include_excerpt = get_option('facebook_include_excerpt', '1');
    $title   = html_entity_decode(get_the_title($post->ID), ENT_QUOTES, 'UTF-8');
    $message = $title;

    if ($include_excerpt === '1') {
        $raw = $post->post_excerpt ?: wp_trim_words(strip_tags($post->post_content), 40, '');
        $excerpt = html_entity_decode($raw, ENT_QUOTES, 'UTF-8');
        if ($excerpt) $message .= "\n\n" . $excerpt;
    }

    return $message;
}

// ----- Hook: fire on publish -----

add_action('transition_post_status', function ($new_status, $old_status, $post) {
    if ($new_status !== 'publish' || $old_status === 'publish') return;
    if ($post->post_type !== 'post') return;
    if (get_option('facebook_enabled', '1') !== '1') return;

    $page_id    = get_option('facebook_page_id');
    $page_token = get_option('facebook_page_token');
    if (!$page_id || !$page_token) return;

    $base_url  = rtrim(get_option('facebook_site_url') ?: get_option('siteurl'), '/');
    $permalink = get_permalink($post->ID) ?: $base_url . '/?p=' . $post->ID;

    $message = facebook_build_message($post);
    $result  = facebook_post_to_page($page_id, $page_token, $message, $permalink);

    if (is_wp_error($result)) {
        error_log('[Facebook] Post failed: ' . $result->get_error_message());
    } else {
        error_log('[Facebook] Posted: ' . $result);
        update_post_meta($post->ID, '_facebook_post_id', $result);
    }
}, 10, 3);

// ----- Test helper -----

function facebook_crosspost_send_test() {
    $page_id    = get_option('facebook_page_id');
    $page_token = get_option('facebook_page_token');
    if (!$page_id || !$page_token) {
        return new WP_Error('facebook_config', 'Page ID and Page Access Token must be set first.');
    }
    $base_url = rtrim(get_option('facebook_site_url') ?: get_option('siteurl'), '/');
    $message  = "Test post from my blog — Facebook cross-posting is working!";
    return facebook_post_to_page($page_id, $page_token, $message, $base_url);
}
