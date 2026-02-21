const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const mysql = require('mysql2/promise');
const axios = require('axios');
const dns = require('dns').promises;
const path = require('path');
const fs = require('fs');

// Configuration
const CONFIG = {
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  GUILD_ID: process.env.DISCORD_GUILD_ID,
  CONNECTED_ROLE_NAME: process.env.CONNECTED_ROLE_NAME || 'connected',
  WEBSITE_CHANNEL_ID: process.env.WEBSITE_CHANNEL_ID, // Channel where website posts appear
  DB_HOST: process.env.DB_HOST || 'mysql',
  DB_USER: process.env.DB_USER || 'evepanzarino',
  DB_PASSWORD: process.env.DB_PASSWORD || 'TrueLove25320664!',
  DB_NAME: process.env.DB_NAME || 'belonging',
  API_URL: process.env.API_URL || 'http://server:5000',
  WEBSITE_URL: process.env.WEBSITE_URL || 'https://belonging.lgbt',
  BOT_TOKEN_SECRET: process.env.BOT_TOKEN_SECRET || 'belonging_bot_internal_secret'
};

// Rate limiting queue
class RateLimitQueue {
  constructor(messagesPerSecond = 1) {
    this.queue = [];
    this.processing = false;
    this.interval = 1000 / messagesPerSecond;
  }

  async add(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const { task, resolve, reject } = this.queue.shift();
      try {
        const result = await task();
        resolve(result);
      } catch (error) {
        reject(error);
      }
      await new Promise(r => setTimeout(r, this.interval));
    }

    this.processing = false;
  }
}

const rateLimitQueue = new RateLimitQueue(2); // 2 messages per second

// Database connection pool
let pool;
async function initDatabase() {
  pool = mysql.createPool({
    host: CONFIG.DB_HOST,
    user: CONFIG.DB_USER,
    password: CONFIG.DB_PASSWORD,
    database: CONFIG.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  console.log('Database pool created');
}

// Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Message, Partials.Channel]
});

// Check if user has "connected" role
function hasConnectedRole(member) {
  return member.roles.cache.some(role =>
    role.name.toLowerCase() === CONFIG.CONNECTED_ROLE_NAME.toLowerCase()
  );
}

// Get belonging.lgbt user by Discord ID
async function getBelongingUser(discordId) {
  const [users] = await pool.execute(
    'SELECT id, username, handle, profile_picture FROM users WHERE discord_id = ?',
    [discordId]
  );
  return users[0] || null;
}

// Get or create discord-only user
async function getOrCreateDiscordUser(member) {
  const [existing] = await pool.execute(
    'SELECT * FROM discord_users WHERE discord_id = ?',
    [member.id]
  );

  if (existing.length > 0) {
    // Update username/avatar if changed
    if (existing[0].discord_username !== member.user.username ||
      existing[0].discord_avatar !== member.user.avatar) {
      await pool.execute(
        'UPDATE discord_users SET discord_username = ?, discord_avatar = ? WHERE discord_id = ?',
        [member.user.username, member.user.avatar, member.id]
      );
    }
    return existing[0];
  }

  const [result] = await pool.execute(
    'INSERT INTO discord_users (discord_id, discord_username, discord_discriminator, discord_avatar) VALUES (?, ?, ?, ?)',
    [member.id, member.user.username, member.user.discriminator || '0', member.user.avatar]
  );

  return {
    id: result.insertId,
    discord_id: member.id,
    discord_username: member.user.username,
    discord_avatar: member.user.avatar
  };
}

// Download image attachments from Discord
async function downloadDiscordAttachments(message) {
  const attachmentUrls = [];
  try {
    for (const attachment of message.attachments.values()) {
      if (attachment.contentType?.startsWith('image/')) {
        try {
          const response = await fetch(attachment.url);
          if (!response.ok) {
            console.error(`Failed to fetch attachment ${attachment.id}: ${response.status}`);
            continue;
          }
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // Use original filename or generate one
          const ext = path.extname(attachment.name) || '.jpg';
          const filename = `${Date.now()}-${attachment.id}${ext}`;
          const filepath = path.join('/app/uploads', filename);

          fs.writeFileSync(filepath, buffer);

          // Return the relative URL path that the server will serve
          const imageUrl = `/uploads/${filename}`;
          attachmentUrls.push(imageUrl);
          console.log(`✓ Downloaded image: ${filename}`);
        } catch (err) {
          console.error(`✗ Failed to download attachment ${attachment.id}:`, err.message);
        }
      }
    }
  } catch (error) {
    console.error('Error downloading attachments:', error);
  }
  return attachmentUrls;
}

// Create post on website from Discord message
async function createPostFromDiscord(message, belongingUser, discordUser) {
  try {
    console.log(`\n[POST] Creating post from Discord message`);
    console.log(`  Message ID: ${message.id}`);
    console.log(`  Content length: ${message.content.length}`);
    console.log(`  Content: "${message.content.substring(0, 100)}${message.content.length > 100 ? '...' : ''}"`);
    console.log(`  Author: ${message.author.username}#${message.author.discriminator}`);

    let postUserId = null;
    let authorName = '';
    let authorAvatar = '';

    if (belongingUser) {
      // User has linked belonging.lgbt account - post as them
      postUserId = belongingUser.id;
      authorName = belongingUser.handle || belongingUser.username;
      authorAvatar = belongingUser.profile_picture;
      console.log(`  [USER] Using linked belonging.lgbt account: user_id=${postUserId}`);
    } else if (discordUser) {
      // Discord-only user - we'll track it differently
      authorName = discordUser.discord_username;
      authorAvatar = discordUser.discord_avatar
        ? `https://cdn.discordapp.com/avatars/${discordUser.discord_id}/${discordUser.discord_avatar}.png`
        : null;
      console.log(`  [USER] Discord-only user: ${authorName}`);
    }

    // Get attachment URLs
    const attachmentUrls = await downloadDiscordAttachments(message);

    // Create the post content
    let content = message.content;
    if (attachmentUrls.length > 0) {
      console.log(`  [IMAGES] Found ${attachmentUrls.length} attachments`);
      content += '\n' + attachmentUrls.map(url => `<img src="${url}" style="max-width: 100%; height: auto;" />`).join('\n');
    }

    // Create tagline from content (first 100 chars or until first newline)
    const tagline = content.substring(0, 100).split('\n')[0] || 'Untitled Post';
    console.log(`  [TAGLINE] "${tagline}"`);
    console.log(`  [CONTENT] Final content length: ${content.length}`);

    if (belongingUser) {
      // Create as belonging user
      const [postResult] = await pool.execute(
        'INSERT INTO posts (user_id, tagline, content) VALUES (?, ?, ?)',
        [postUserId, tagline, content]
      );

      console.log(`  ✓ Created post ${postResult.insertId}`);

      // Award XP for posting
      await awardXP(postUserId, 'posting', 50, 'Discord post synced');

      // Create a thread for comments
      let threadId = null;
      try {
        const thread = await rateLimitQueue.add(async () => {
          return await message.startThread({
            name: (tagline || 'Discussion').substring(0, 100),
            autoArchiveDuration: 1440, // 24 hours
          });
        });
        threadId = thread.id;
        console.log(`Created thread ${threadId} for Discord-originating post ${postResult.insertId}`);
      } catch (error) {
        console.error(`Error creating thread for Discord post ${postResult.insertId}:`, error);
      }

      // Record sync with thread ID
      await pool.execute(
        'INSERT INTO discord_post_sync (post_id, discord_message_id, discord_channel_id, discord_thread_id, discord_user_id, direction) VALUES (?, ?, ?, ?, ?, ?)',
        [postResult.insertId, message.id, message.channel.id, threadId, message.author.id, 'discord_to_web']
      );

      // Track this message as recently created to avoid auto-edit overwrites
      recentlyCreatedMessages.set(message.id, Date.now());

      console.log(`Synced Discord message ${message.id} to post ${postResult.insertId} (belonging user: ${belongingUser.username})`);
      return postResult.insertId;

    } else {
      // Discord-only user post - just use the content without prefix
      const [postResult] = await pool.execute(
        'INSERT INTO posts (user_id, tagline, content) VALUES (?, ?, ?)',
        [2, tagline, content] // Use 'belonging' user (ID 2) as placeholder
      );

      // Create a thread for comments
      let threadId = null;
      try {
        const thread = await rateLimitQueue.add(async () => {
          return await message.startThread({
            name: (tagline || 'Discussion').substring(0, 100),
            autoArchiveDuration: 1440, // 24 hours
          });
        });
        threadId = thread.id;
        console.log(`Created thread ${threadId} for Discord-originating post ${postResult.insertId}`);
      } catch (error) {
        console.error(`Error creating thread for Discord post ${postResult.insertId}:`, error);
      }

      // Record sync with thread ID
      await pool.execute(
        'INSERT INTO discord_post_sync (post_id, discord_message_id, discord_channel_id, discord_thread_id, discord_user_id, direction) VALUES (?, ?, ?, ?, ?, ?)',
        [postResult.insertId, message.id, message.channel.id, threadId, message.author.id, 'discord_to_web']
      );

      // Track this message as recently created to avoid auto-edit overwrites
      recentlyCreatedMessages.set(message.id, Date.now());

      console.log(`Synced Discord message ${message.id} to post ${postResult.insertId} (discord-only user: ${authorName})`);
      return postResult.insertId;
    }

  } catch (error) {
    console.error('Error creating post from Discord:', error);
    return null;
  }
}

// Create comment from Discord thread reply
async function createCommentFromDiscord(message, parentPostId, belongingUser, discordUser) {
  try {
    // Get attachment URLs
    const attachmentUrls = await downloadDiscordAttachments(message);

    let content = message.content;
    if (attachmentUrls.length > 0) {
      content += '\n' + attachmentUrls.map(url => `![image](${url})`).join('\n');
    }

    let commentUserId = null;

    if (belongingUser) {
      commentUserId = belongingUser.id;
    } else {
      // Discord-only user - just use content without prefix
      commentUserId = 2; // 'belonging' user (ID 2) placeholder
    }

    const [commentResult] = await pool.execute(
      'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
      [parentPostId, commentUserId, content]
    );

    // Award XP if linked user
    if (belongingUser) {
      await awardXP(commentUserId, 'commenting', 35, 'Discord comment synced');
    }

    // Record sync
    await pool.execute(
      'INSERT INTO discord_comment_sync (comment_id, discord_message_id, discord_thread_id, discord_user_id, direction) VALUES (?, ?, ?, ?, ?)',
      [commentResult.insertId, message.id, message.channel.id, message.author.id, 'discord_to_web']
    );

    // Mirror to thread if this was a reply in the main channel
    const [threadRecord] = await pool.execute(
      'SELECT discord_thread_id FROM discord_post_sync WHERE post_id = ?',
      [parentPostId]
    );

    if (threadRecord.length > 0 && threadRecord[0].discord_thread_id) {
      const threadId = threadRecord[0].discord_thread_id;

      // If the current message is NOT in the thread, mirror it there
      if (message.channel.id !== threadId) {
        try {
          const thread = await message.guild.channels.fetch(threadId);
          if (thread && thread.isThread()) {
            await rateLimitQueue.add(async () => {
              const mirrorContent = `**${message.author.username}**: ${content}`;
              await thread.send({
                content: mirrorContent,
                allowedMentions: { parse: [] } // Avoid pinging users again
              });
            });
            console.log(`Mirrored Discord reply ${message.id} to thread ${threadId}`);
          }
        } catch (error) {
          console.error(`Error mirroring message to thread ${threadId}:`, error);
        }
      }
    }

    console.log(`Synced Discord reply ${message.id} to comment ${commentResult.insertId}`);
    return commentResult.insertId;

  } catch (error) {
    console.error('Error creating comment from Discord:', error);
    return null;
  }
}

// Award XP helper
async function awardXP(userId, skillName, xp, reason) {
  try {
    // Update or insert skill
    await pool.execute(
      `INSERT INTO user_skills (user_id, skill_name, xp) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE xp = xp + ?`,
      [userId, skillName, xp, xp]
    );

    // Log XP history
    await pool.execute(
      'INSERT INTO xp_history (user_id, skill_name, xp_gained, reason) VALUES (?, ?, ?, ?)',
      [userId, skillName, xp, reason]
    );
  } catch (error) {
    console.error('Error awarding XP:', error);
  }
}

// Post website content to Discord
async function postToDiscord(post, user) {
  try {
    const channel = await client.channels.fetch(CONFIG.WEBSITE_CHANNEL_ID);
    if (!channel) {
      console.error('Website channel not found');
      return null;
    }

    // Check if already synced
    const [existing] = await pool.execute(
      'SELECT * FROM discord_post_sync WHERE post_id = ? AND direction = ?',
      [post.id, 'web_to_discord']
    );
    if (existing.length > 0) {
      console.log(`Post ${post.id} already synced to Discord`);
      return existing[0].discord_message_id;
    }

    const avatarUrl = user.profile_picture?.startsWith('http')
      ? user.profile_picture
      : user.discord_avatar
        ? `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.discord_avatar}.png`
        : null;

    // Extract images from HTML content and clean it for Discord
    const imgRegex = /<img[^>]+src="([^">]+)"[^>]*>/g;
    let cleanContent = post.content;
    const images = [];
    let match;

    console.log(`[postToDiscord] Original content: ${post.content.substring(0, 200)}`);

    while ((match = imgRegex.exec(post.content)) !== null) {
      images.push(match[1]);
      console.log(`[postToDiscord] Found image: ${match[1]}`);
    }

    // Remove ALL HTML tags from content - more aggressive
    cleanContent = cleanContent.replace(/<[^>]*>/g, '');
    // Trim and normalize whitespace
    cleanContent = cleanContent.trim().replace(/\s+/g, ' ');

    console.log(`[postToDiscord] Clean content: "${cleanContent}"`);
    console.log(`[postToDiscord] Found ${images.length} images`);

    // If content is empty after removing images, use tagline
    if (!cleanContent) {
      cleanContent = post.tagline || 'Image post';
    }

    const embed = new EmbedBuilder()
      .setAuthor({
        name: user.handle || user.username,
        iconURL: avatarUrl || undefined
      })
      .setTitle(post.tagline || 'Post')
      .setDescription(cleanContent.substring(0, 4096))
      .setColor(0x667eea)
      .setTimestamp(new Date(post.created_at))
      .setFooter({ text: 'Posted on belonging.lgbt' });

    // Add first image to embed if available
    if (images.length > 0) {
      embed.setImage(images[0]);
      console.log(`[postToDiscord] Setting image: ${images[0]}`);
    }

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel('View on Website')
          .setStyle(ButtonStyle.Link)
          .setURL(`${CONFIG.WEBSITE_URL}/post/${post.id}`)
      );

    const sentMessage = await rateLimitQueue.add(async () => {
      return await channel.send({ embeds: [embed], components: [row] });
    });

    // Send additional images if there are more than one
    if (images.length > 1) {
      for (let i = 1; i < images.length; i++) {
        await rateLimitQueue.add(async () => {
          const imageEmbed = new EmbedBuilder()
            .setImage(images[i])
            .setColor(0x667eea);
          return await channel.send({ embeds: [imageEmbed] });
        });
      }
    }

    // Create a thread for comments
    let threadId = null;
    try {
      const thread = await rateLimitQueue.add(async () => {
        return await sentMessage.startThread({
          name: (post.tagline || 'Discussion').substring(0, 100),
          autoArchiveDuration: 1440, // 24 hours
        });
      });
      threadId = thread.id;
      console.log(`Created thread ${threadId} for post ${post.id}`);
    } catch (error) {
      console.error(`Error creating thread for post ${post.id}:`, error);
    }

    // Record sync with thread ID
    await pool.execute(
      'INSERT INTO discord_post_sync (post_id, discord_message_id, discord_channel_id, discord_thread_id, discord_user_id, direction) VALUES (?, ?, ?, ?, ?, ?)',
      [post.id, sentMessage.id, channel.id, threadId, user.discord_id, 'web_to_discord']
    );

    console.log(`Synced website post ${post.id} to Discord message ${sentMessage.id}`);

    // Sync all existing comments to the Discord channel
    await syncAllCommentsToDiscord(post, post.id);

    return sentMessage.id;

  } catch (error) {
    console.error('Error posting to Discord:', error);
    return null;
  }
}

// Post website comment to Discord channel
async function postCommentToDiscord(comment, user, postId) {
  try {
    const channel = await client.channels.fetch(CONFIG.WEBSITE_CHANNEL_ID);
    if (!channel) {
      console.error('Website channel not found');
      return null;
    }

    // Check if already synced
    const [existing] = await pool.execute(
      'SELECT * FROM discord_comment_sync WHERE comment_id = ? AND direction = ?',
      [comment.id, 'web_to_discord']
    );
    if (existing.length > 0) {
      console.log(`Comment ${comment.id} already synced to Discord`);
      return existing[0].discord_message_id;
    }

    const displayName = user.handle || user.username;

    // Fetch the post title to show which post this comment belongs to
    const [posts] = await pool.execute(
      'SELECT id, tagline, content FROM posts WHERE id = ?',
      [postId]
    );
    console.log(`[postCommentToDiscord] Fetching post ${postId}, found:`, posts);

    let postTitle = 'Unknown Post';
    if (posts.length > 0) {
      const post = posts[0];
      console.log(`[postCommentToDiscord] Post data - tagline: "${post.tagline}", content length: ${post.content?.length || 0}`);
      // Use tagline if available, otherwise extract first line from content
      if (post.tagline) {
        postTitle = post.tagline;
        console.log(`[postCommentToDiscord] Using tagline: "${postTitle}"`);
      } else if (post.content) {
        // Extract first line (up to 100 chars)
        const cleanedContent = post.content.replace(/<[^>]*>/g, '');
        const firstLine = cleanedContent.split('\n')[0].substring(0, 100);
        postTitle = firstLine || 'Untitled Post';
        console.log(`[postCommentToDiscord] Extracted from content: "${postTitle}"`);
      }
    } else {
      console.log(`[postCommentToDiscord] No posts found for ID ${postId}`);
    }
    console.log(`[postCommentToDiscord] Final post title: "${postTitle}"`);

    // Extract images from comment content
    const imgRegex = /<img[^>]+src="([^">]+)"[^>]*>/g;
    let cleanContent = comment.content;
    const images = [];
    let match;

    while ((match = imgRegex.exec(comment.content)) !== null) {
      images.push(match[1]);
    }

    // Remove img tags from content
    cleanContent = cleanContent.replace(/<img[^>]*>/g, '').trim();

    // Create embed for comment
    const description = `Post: **${postTitle}**\n${cleanContent || '(No text, image only)'}`;
    console.log(`[postCommentToDiscord] Creating embed with commenter: "${displayName}" and post title in description: "${postTitle}"`);
    console.log(`[postCommentToDiscord] Description: "${description}"`);

    const embed = new EmbedBuilder()
      .setTitle(displayName)
      .setDescription(description)
      .setColor(0x667eea)
      .setTimestamp(new Date(comment.created_at))
      .setFooter({ text: `Comment ${comment.id}` });

    console.log(`[DEBUG] About to send Discord embed for comment ${comment.id}`);
    console.log(`[DEBUG] postTitle: "${postTitle}"`);
    console.log(`[DEBUG] embed description: "${description}"`);

    console.log(`[postCommentToDiscord] Embed created with title: "${embed.data.title}"`);

    // Add first image if available
    if (images.length > 0) {
      embed.setImage(images[0]);
    }

    // Post to main channel (keep existing functionality)
    let sentMessage = await rateLimitQueue.add(async () => {
      console.log(`[postCommentToDiscord] Sending embed to channel: ${channel.id}`);
      return await channel.send({ embeds: [embed] });
    });

    // Send additional images as separate embeds to main channel
    if (images.length > 1) {
      for (let i = 1; i < images.length; i++) {
        sentMessage = await rateLimitQueue.add(async () => {
          const imageEmbed = new EmbedBuilder()
            .setAuthor({ name: displayName })
            .setImage(images[i])
            .setColor(0x667eea);
          return await channel.send({ embeds: [imageEmbed] });
        });
      }
    }

    // ALSO post to thread if it exists
    let threadMessage = null;
    try {
      // Find the thread for this post
      const [postSync] = await pool.execute(
        'SELECT discord_thread_id FROM discord_post_sync WHERE post_id = ?',
        [postId]
      );

      if (postSync.length > 0 && postSync[0].discord_thread_id) {
        const threadId = postSync[0].discord_thread_id;
        console.log(`[postCommentToDiscord] Found thread ${threadId} for post ${postId}`);

        try {
          const thread = await client.channels.fetch(threadId);
          if (thread && thread.isThread()) {
            // Create a simpler embed for the thread (without post title since it's in the thread)
            const threadEmbed = new EmbedBuilder()
              .setAuthor({ name: displayName })
              .setDescription(cleanContent || '(No text, image only)')
              .setColor(0x667eea)
              .setTimestamp(new Date(comment.created_at));

            // Add first image if available
            if (images.length > 0) {
              threadEmbed.setImage(images[0]);
            }

            threadMessage = await rateLimitQueue.add(async () => {
              return await thread.send({ embeds: [threadEmbed] });
            });

            // Send additional images to thread
            if (images.length > 1) {
              for (let i = 1; i < images.length; i++) {
                await rateLimitQueue.add(async () => {
                  const imageEmbed = new EmbedBuilder()
                    .setAuthor({ name: displayName })
                    .setImage(images[i])
                    .setColor(0x667eea);
                  return await thread.send({ embeds: [imageEmbed] });
                });
              }
            }

            console.log(`[postCommentToDiscord] Posted comment ${comment.id} to thread ${threadId}`);
          }
        } catch (threadError) {
          console.error(`[postCommentToDiscord] Error posting to thread:`, threadError);
        }
      } else {
        console.log(`[postCommentToDiscord] No thread found for post ${postId}`);
      }
    } catch (error) {
      console.error(`[postCommentToDiscord] Error finding thread:`, error);
    }

    // Record sync (main channel message)
    if (sentMessage) {
      await pool.execute(
        'INSERT INTO discord_comment_sync (comment_id, discord_message_id, discord_thread_id, discord_user_id, direction) VALUES (?, ?, ?, ?, ?)',
        [comment.id, sentMessage.id, threadMessage ? threadMessage.id : null, user.discord_id, 'web_to_discord']
      );

      console.log(`Synced website comment ${comment.id} to Discord channel`);
    }

    return sentMessage ? sentMessage.id : null;

  } catch (error) {
    console.error('Error posting comment to Discord:', error);
    return null;
  }
}

// Sync all existing comments from website to Discord channel
async function syncAllCommentsToDiscord(post, postId) {
  try {
    const channel = await client.channels.fetch(CONFIG.WEBSITE_CHANNEL_ID);
    if (!channel) {
      console.error('Website channel not found');
      return;
    }

    // Fetch all comments from the API
    const response = await axios.get(`${CONFIG.API_URL}/api/posts/${postId}/comments`);
    const comments = response.data || [];

    if (comments.length === 0) {
      console.log(`No comments to sync for post ${postId}`);
      return;
    }

    // Helper function to recursively post comments as separate embeds
    async function postCommentTree(commentsList, level = 0) {
      for (const comment of commentsList) {
        // Check if already synced
        const [existing] = await pool.execute(
          'SELECT * FROM discord_comment_sync WHERE comment_id = ?',
          [comment.id]
        );

        if (existing.length === 0) {
          // Get user info
          const [users] = await pool.execute(
            'SELECT username, handle FROM users WHERE id = ?',
            [comment.user_id]
          );
          const user = users[0] || { username: 'Unknown', handle: null };
          const displayName = user.handle || user.username;

          // Extract images from comment
          const imgRegex = /<img[^>]+src="([^">]+)"[^>]*>/g;
          let cleanContent = comment.content;
          const images = [];
          let match;

          while ((match = imgRegex.exec(comment.content)) !== null) {
            images.push(match[1]);
          }

          cleanContent = cleanContent.replace(/<img[^>]*>/g, '').trim();

          let sentMessage;

          // Create embed for comment with indentation indicator
          const indentPrefix = level > 0 ? '↳ '.repeat(level) : '';
          const embed = new EmbedBuilder()
            .setAuthor({ name: `${indentPrefix}${displayName}` });

          // Add post title as embed title for top-level comments (with fallback to content)
          if (level === 0) {
            let postTitle = 'Unknown Post';
            if (post.tagline) {
              postTitle = post.tagline;
            } else if (post.content) {
              const firstLine = post.content.replace(/<[^>]*>/g, '').split('\n')[0].substring(0, 100);
              postTitle = firstLine || 'Untitled Post';
            }
            embed.setTitle(`📌 ${postTitle}`);
          }

          embed
            .setDescription(cleanContent || '(No text, image only)')
            .setColor(level > 0 ? 0x9f7aea : 0x667eea) // Different color for replies
            .setTimestamp(new Date(comment.created_at))
            .setFooter({ text: `Comment ${comment.id}` });

          // Add first image if available
          if (images.length > 0) {
            embed.setImage(images[0]);
          }

          sentMessage = await rateLimitQueue.add(async () => {
            return await channel.send({ embeds: [embed] });
          });

          // Send additional images as separate embeds
          if (images.length > 1) {
            for (let i = 1; i < images.length; i++) {
              await rateLimitQueue.add(async () => {
                const imageEmbed = new EmbedBuilder()
                  .setAuthor({ name: displayName })
                  .setImage(images[i])
                  .setColor(0x667eea);
                return await channel.send({ embeds: [imageEmbed] });
              });
            }
          }

          // Record sync
          if (sentMessage) {
            await pool.execute(
              'INSERT INTO discord_comment_sync (comment_id, discord_message_id, discord_user_id, direction) VALUES (?, ?, ?, ?)',
              [comment.id, sentMessage.id, comment.user_id, 'web_to_discord']
            );
          }
        }

        // Post nested replies
        if (comment.replies && comment.replies.length > 0) {
          await postCommentTree(comment.replies, level + 1);
        }
      }
    }

    // Post all comments recursively to the channel
    await postCommentTree(comments);
    console.log(`Synced all comments for post ${postId} to Discord channel`);

  } catch (error) {
    console.error('Error syncing comments to Discord:', error);
  }
}

// Track recently created messages to avoid overwriting them with auto-edits
const recentlyCreatedMessages = new Map();

// Handle message edits (two-way sync)
async function handleMessageEdit(oldMessage, newMessage) {
  try {
    console.log(`[EDIT EVENT] Message ${newMessage.id} edited`);

    // Skip if this was just created (Discord auto-processing embeds)
    if (recentlyCreatedMessages.has(newMessage.id)) {
      const createdTime = recentlyCreatedMessages.get(newMessage.id);
      if (Date.now() - createdTime < 5000) { // 5 seconds grace period for Discord to process embeds
        console.log(`[SKIP] Message edited immediately after creation (likely auto-embed), ignoring`);
        return;
      }
      recentlyCreatedMessages.delete(newMessage.id);
    }

    // Check if this is a synced post
    const [postSync] = await pool.execute(
      'SELECT * FROM discord_post_sync WHERE discord_message_id = ?',
      [newMessage.id]
    );

    if (postSync.length > 0 && postSync[0].post_id) {
      // Only update if content actually changed (not just embed auto-processing)
      // Don't update if new content is empty - that's likely Discord auto-processing
      console.log(`  [UPDATE CHECK] oldContent="${oldMessage.content}" newContent="${newMessage.content}"`);
      console.log(`  [UPDATE CHECK] oldTrim="${oldMessage.content.trim()}" newTrim="${newMessage.content.trim()}"`);
      if (oldMessage.content !== newMessage.content && newMessage.content.trim() !== '') {
        // Update the website post with any new content and images
        const attachmentUrls = await downloadDiscordAttachments(newMessage);
        let content = newMessage.content;
        if (attachmentUrls.length > 0) {
          content += '\n' + attachmentUrls.map(url => `<img src="${url}" style="max-width: 100%; height: auto;" />`).join('\n');
        }

        await pool.execute(
          'UPDATE posts SET content = ?, updated_at = NOW() WHERE id = ?',
          [content, postSync[0].post_id]
        );
        console.log(`Updated website post ${postSync[0].post_id} from Discord edit`);
      } else {
        console.log(`[SKIP] Post ${postSync[0].post_id} content unchanged or empty, ignoring edit`);
      }
    }

    // Check if this is a synced comment
    const [commentSync] = await pool.execute(
      'SELECT * FROM discord_comment_sync WHERE discord_message_id = ?',
      [newMessage.id]
    );

    if (commentSync.length > 0 && commentSync[0].comment_id) {
      // Only update if content actually changed
      if (oldMessage.content !== newMessage.content && newMessage.content.trim() !== '') {
        const attachmentUrls = await downloadDiscordAttachments(newMessage);
        let content = newMessage.content;
        if (attachmentUrls.length > 0) {
          content += '\n' + attachmentUrls.map(url => `<img src="${url}" style="max-width: 100%; height: auto;" />`).join('\n');
        }

        await pool.execute(
          'UPDATE comments SET content = ?, updated_at = NOW() WHERE id = ?',
          [content, commentSync[0].comment_id]
        );
        console.log(`Updated website comment ${commentSync[0].comment_id} from Discord edit`);
      } else {
        console.log(`[SKIP] Comment ${commentSync[0].comment_id} content unchanged or empty, ignoring edit`);
      }
    }

  } catch (error) {
    console.error('Error handling message edit:', error);
  }
}

// Handle message deletions
async function handleMessageDelete(message) {
  try {
    // Check if this is a synced post
    const [postSync] = await pool.execute(
      'SELECT * FROM discord_post_sync WHERE discord_message_id = ?',
      [message.id]
    );

    if (postSync.length > 0 && postSync[0].post_id && postSync[0].direction === 'discord_to_web') {
      // Delete the website post (cascade will handle comments)
      await pool.execute('DELETE FROM posts WHERE id = ?', [postSync[0].post_id]);
      console.log(`Deleted website post ${postSync[0].post_id} due to Discord deletion`);
      return;
    }

    // Check if this is a synced comment
    const [commentSync] = await pool.execute(
      'SELECT * FROM discord_comment_sync WHERE discord_message_id = ?',
      [message.id]
    );

    if (commentSync.length > 0 && commentSync[0].comment_id && commentSync[0].direction === 'discord_to_web') {
      await pool.execute('DELETE FROM comments WHERE id = ?', [commentSync[0].comment_id]);
      console.log(`Deleted website comment ${commentSync[0].comment_id} due to Discord deletion`);
    }

  } catch (error) {
    console.error('Error handling message delete:', error);
  }
}

// Auto-close all threads in the #feed channel
async function autoCloseThreadsInFeed() {
  try {
    console.log('[AUTO-CLOSE] Checking for threads to close in #feed...');

    const channel = await client.channels.fetch(CONFIG.WEBSITE_CHANNEL_ID);
    if (!channel) {
      console.error('[AUTO-CLOSE] Website channel not found');
      return;
    }

    // Fetch all active threads in the channel
    const activeThreads = await channel.threads.fetchActive();
    console.log(`[AUTO-CLOSE] Found ${activeThreads.threads.size} active threads`);

    let closedCount = 0;
    for (const [threadId, thread] of activeThreads.threads) {
      try {
        // Archive the thread (this is Discord's way of "closing" a thread)
        await thread.setArchived(true, 'Auto-closing thread in #feed');
        console.log(`[AUTO-CLOSE] ✓ Closed thread: ${thread.name} (ID: ${threadId})`);
        closedCount++;

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 500));
      } catch (error) {
        console.error(`[AUTO-CLOSE] ✗ Failed to close thread ${threadId}:`, error.message);
      }
    }

    console.log(`[AUTO-CLOSE] Completed. Closed ${closedCount} threads.`);
  } catch (error) {
    console.error('[AUTO-CLOSE] Error closing threads:', error);
  }
}

// Discord event handlers
client.once('ready', () => {
  console.log(`Discord bot logged in as ${client.user.tag}`);
  console.log(`Watching guild: ${CONFIG.GUILD_ID}`);
  console.log(`Connected role: ${CONFIG.CONNECTED_ROLE_NAME}`);

  // Auto-close threads every 5 minutes
  console.log('[AUTO-CLOSE] Starting auto-close thread task (runs every 5 minutes)');
  autoCloseThreadsInFeed(); // Run immediately on startup
  setInterval(autoCloseThreadsInFeed, 5 * 60 * 1000); // Then every 5 minutes
});

client.on('messageCreate', async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;

  // Ignore DMs
  if (!message.guild) return;

  // Only process messages from our guild
  if (message.guild.id !== CONFIG.GUILD_ID) return;

  // Skip messages that have already been synced (they're from the bot's own processing)
  const [alreadySynced] = await pool.execute(
    'SELECT id FROM discord_post_sync WHERE discord_message_id = ?',
    [message.id]
  );
  if (alreadySynced.length > 0) {
    console.log(`[SKIP] Message ${message.id} already synced, ignoring duplicate`);
    return;
  }

  // Get member
  const member = message.member || await message.guild.members.fetch(message.author.id);

  // Check if this is a thread reply (for comments) - don't need connected role for replies
  if (message.channel.isThread()) {
    console.log(`Thread reply detected in thread ${message.channel.id}`);
    // Find the parent post
    const [parentSync] = await pool.execute(
      'SELECT post_id FROM discord_post_sync WHERE discord_thread_id = ?',
      [message.channel.id]
    );

    if (parentSync.length > 0 && parentSync[0].post_id) {
      const belongingUser = await getBelongingUser(message.author.id);
      const discordUser = belongingUser ? null : await getOrCreateDiscordUser(member);

      await createCommentFromDiscord(message, parentSync[0].post_id, belongingUser, discordUser);
    }
    return;
  }

  // Check if this message is a reply to another message - don't need connected role for replies
  if (message.reference) {
    console.log(`\n[REPLY DETECTED] Direct reply to message ${message.reference.messageId}`);
    try {
      const replyTo = await message.channel.messages.fetch(message.reference.messageId);
      console.log(`[REPLY] Fetched original message: ID=${replyTo.id}, Author=${replyTo.author?.username}, Bot=${replyTo.author?.bot}`);
      console.log(`[REPLY] Looking up message ID in discord_post_sync table...`);

      // Check if the replied-to message is synced to a post
      const [repliedSync] = await pool.execute(
        'SELECT post_id, discord_message_id, direction FROM discord_post_sync WHERE discord_message_id = ?',
        [replyTo.id]
      );

      console.log(`[REPLY] Query result: found ${repliedSync.length} synced posts`);
      if (repliedSync.length > 0) {
        repliedSync.forEach((record, i) => {
          console.log(`[REPLY]   Record ${i}: post_id=${record.post_id}, direction=${record.direction}`);
        });
      }

      if (repliedSync.length > 0 && repliedSync[0].post_id) {
        // This is a reply to a synced post - create as a comment
        console.log(`[REPLY] ✓ SUCCESS: Creating comment on post ${repliedSync[0].post_id}`);
        const belongingUser = await getBelongingUser(message.author.id);
        const discordUser = belongingUser ? null : await getOrCreateDiscordUser(member);

        await createCommentFromDiscord(message, repliedSync[0].post_id, belongingUser, discordUser);
        return;
      } else {
        console.log(`[REPLY] ✗ FAILED: No synced post found for message ${replyTo.id} - will create new post instead`);
        // Don't return - fall through to create new post
      }
    } catch (err) {
      console.error('[REPLY] ERROR fetching replied message:', err.message);
    }
  }

  // Regular channel message - only create posts from the #feed channel
  if (message.channel.id !== CONFIG.WEBSITE_CHANNEL_ID) {
    console.log(`Message in channel ${message.channel.id} (not feed channel ${CONFIG.WEBSITE_CHANNEL_ID}) - ignoring`);
    return;
  }

  // Create post (requires connected role)
  console.log(`Feed channel message - checking for "connected" role`);
  if (!hasConnectedRole(member)) {
    console.log(`User does not have "connected" role - not creating post`);
    return;
  }

  const belongingUser = await getBelongingUser(message.author.id);
  const discordUser = belongingUser ? null : await getOrCreateDiscordUser(member);

  console.log(`Creating new post from message in #feed channel`);
  await createPostFromDiscord(message, belongingUser, discordUser);
});

client.on('messageUpdate', async (oldMessage, newMessage) => {
  if (newMessage.author?.bot) return;
  if (!newMessage.guild || newMessage.guild.id !== CONFIG.GUILD_ID) return;

  await handleMessageEdit(oldMessage, newMessage);
});

client.on('messageDelete', async (message) => {
  if (message.author?.bot) return;
  if (!message.guild || message.guild.id !== CONFIG.GUILD_ID) return;

  await handleMessageDelete(message);
});

// HTTP endpoint for website to notify bot of new posts/comments
const express = require('express');
const app = express();
app.use(express.json());

// Verify internal requests
const verifyBotToken = (req, res, next) => {
  const token = req.headers['x-bot-token'];
  if (token !== CONFIG.BOT_TOKEN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Website created a new post - sync to Discord
app.post('/api/sync/post', verifyBotToken, async (req, res) => {
  try {
    const { postId } = req.body;

    const [posts] = await pool.execute(
      `SELECT p.*, u.username, u.handle, u.profile_picture, u.discord_id, u.discord_avatar 
       FROM posts p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.id = ?`,
      [postId]
    );

    if (posts.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = posts[0];
    const user = posts[0];
    const messageId = await postToDiscord(post, user);

    res.json({ success: true, discord_message_id: messageId });
  } catch (error) {
    console.error('Error syncing post to Discord:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// Website created a new comment - sync to Discord thread
app.post('/api/sync/comment', verifyBotToken, async (req, res) => {
  try {
    console.log(`[API] Received comment sync request:`, req.body);
    const { commentId, postId } = req.body;

    if (!commentId || !postId) {
      console.error(`[API] Missing required fields: commentId=${commentId}, postId=${postId}`);
      return res.status(400).json({ error: 'commentId and postId are required' });
    }

    const [comments] = await pool.execute(
      `SELECT c.*, u.username, u.handle, u.profile_picture, u.discord_id 
       FROM comments c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.id = ?`,
      [commentId]
    );

    if (comments.length === 0) {
      console.error(`[API] Comment ${commentId} not found`);
      return res.status(404).json({ error: 'Comment not found' });
    }

    const comment = comments[0];
    console.log(`[API] Syncing comment ${commentId} for post ${postId} to Discord`);
    const messageId = await postCommentToDiscord(comment, comment, postId);

    res.json({ success: true, discord_message_id: messageId });
  } catch (error) {
    console.error('[API] Error syncing comment to Discord:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// Website updated a post - sync edit to Discord
app.put('/api/sync/post/:postId', verifyBotToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;

    const [syncRecord] = await pool.execute(
      'SELECT discord_message_id, discord_channel_id FROM discord_post_sync WHERE post_id = ? AND direction = ?',
      [postId, 'web_to_discord']
    );

    if (syncRecord.length === 0) {
      return res.json({ success: true, message: 'No Discord sync found' });
    }

    const channel = await client.channels.fetch(syncRecord[0].discord_channel_id);
    const message = await channel.messages.fetch(syncRecord[0].discord_message_id);

    const embed = EmbedBuilder.from(message.embeds[0])
      .setDescription(content.substring(0, 4096));

    await rateLimitQueue.add(async () => {
      await message.edit({ embeds: [embed] });
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error syncing post edit to Discord:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// Website deleted a post - delete from Discord
app.delete('/api/sync/post/:postId', verifyBotToken, async (req, res) => {
  try {
    const { postId } = req.params;

    const [syncRecord] = await pool.execute(
      'SELECT discord_message_id, discord_channel_id FROM discord_post_sync WHERE post_id = ? AND direction = ?',
      [postId, 'web_to_discord']
    );

    if (syncRecord.length === 0) {
      return res.json({ success: true, message: 'No Discord sync found' });
    }

    const channel = await client.channels.fetch(syncRecord[0].discord_channel_id);
    const message = await channel.messages.fetch(syncRecord[0].discord_message_id);

    await rateLimitQueue.add(async () => {
      await message.delete();
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting synced post from Discord:', error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// Start bot and HTTP server
const HTTP_PORT = process.env.HTTP_PORT || 5005;

// Retry login with exponential backoff
async function loginWithRetry(maxRetries = 10) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Check DNS before attempting login
      console.log(`[Attempt ${attempt}/${maxRetries}] Testing DNS resolution for discord.com...`);
      await dns.resolve4('discord.com');
      console.log('✓ DNS resolution successful');

      console.log('Attempting Discord bot login...');
      await client.login(CONFIG.DISCORD_TOKEN);
      console.log('✓ Discord bot logged in successfully');
      return;
    } catch (error) {
      if (attempt === maxRetries) {
        console.error('Max login retries reached. Bot will continue to serve HTTP endpoint.');
        return;
      }

      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000); // Exponential backoff, max 30s
      console.error(`✗ Login attempt ${attempt} failed: ${error.message}`);
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function start() {
  await initDatabase();

  app.listen(HTTP_PORT, () => {
    console.log(`Bot HTTP server listening on port ${HTTP_PORT}`);
  });

  await loginWithRetry();
}

start().catch(console.error);
