import { StackerNewsClient } from './stackerNewsClient.js';
import { NostrClient } from './nostrClient.js';
import { YouTubeDetector } from './youtubeDetector.js';
import { StateManager } from './stateManager.js';
import { Logger } from './logger.js';

class YewTuBot {
  constructor() {
    this.logger = new Logger();
    this.stackerClient = new StackerNewsClient(this.logger);
    this.nostrClient = new NostrClient(this.logger);
    this.youtubeDetector = new YouTubeDetector(this.logger);
    this.stateManager = new StateManager(this.logger);
  }

  async initialize() {
    this.logger.info('🤖 Initializing YewTuBot...');
    
    try {
      await this.nostrClient.initialize();
      await this.stateManager.initialize();
      this.logger.info('✅ Bot initialization complete');
      return true;
    } catch (error) {
      this.logger.error('❌ Bot initialization failed:', error);
      return false;
    }
  }

  async run() {
    if (!await this.initialize()) {
      process.exit(1);
    }

    try {
      this.logger.info('🔍 Fetching recent posts from Stacker News...');
      
      let recentPosts;
      try {
        recentPosts = await this.stackerClient.getRecentPosts();
      } catch (apiError) {
        this.logger.error('❌ Stacker News API failed:', apiError.message);
        this.logger.info('🔄 Trying alternative approach...');
        
        // Try with simpler query as fallback
        recentPosts = await this.stackerClient.getRecentPostsSimple();
      }
      
      this.logger.info(`📊 Found ${recentPosts.length} recent posts`);

      let processedCount = 0;
      let detectedCount = 0;
      let commentedCount = 0;
      let nostrPostCount = 0;

      for (const post of recentPosts) {
        const result = await this.processPost(post);
        processedCount++;
        if (result.detected) detectedCount++;
        if (result.commented) commentedCount++;
        if (result.nostrPosted) nostrPostCount++;
      }

      this.logger.info('📈 Run Summary:');
      this.logger.info(`  • Posts processed: ${processedCount}`);
      this.logger.info(`  • YouTube links detected: ${detectedCount}`);
      this.logger.info(`  • Comments posted: ${commentedCount}`);
      this.logger.info(`  • Nostr posts created: ${nostrPostCount}`);
      this.logger.info('✅ Bot run completed successfully');

    } catch (error) {
      this.logger.error('❌ Bot run failed:', error);
      this.logger.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      process.exit(1);
    }
  }

  async processPost(post) {
    const postId = post.id;
    const result = { detected: false, commented: false, nostrPosted: false };
    
    // Check if we've already processed this post
    if (await this.stateManager.hasProcessedPost(postId)) {
      this.logger.debug(`⏭️  Skipping already processed post: ${postId}`);
      return result;
    }

    this.logger.info(`🔍 Processing post ${postId} by @${post.user?.name || 'unknown'}`);
    
    // Check if post contains YouTube links
    const youtubeLinks = this.youtubeDetector.extractYouTubeLinks(post.title, post.text || post.url);
    
    if (youtubeLinks.length === 0) {
      this.logger.debug(`  No YouTube links found in post ${postId}`);
      await this.stateManager.markPostAsProcessed(postId);
      return result;
    }

    result.detected = true;
    this.logger.info(`🎥 Found ${youtubeLinks.length} YouTube link(s) in post ${postId}`);
    
    try {
      // Post comment with yewtu.be alternatives
      const comment = this.generateComment(youtubeLinks);
      const commentSuccess = await this.stackerClient.postComment(postId, comment);
      
      if (commentSuccess) {
        result.commented = true;
        this.logger.info(`💬 Posted comment on post ${postId}`);
        
        // Post to Nostr
        const nostrSuccess = await this.postToNostr(post, youtubeLinks);
        if (nostrSuccess) {
          result.nostrPosted = true;
          this.logger.info(`📡 Posted to Nostr for post ${postId}`);
        }
      }
      
      // Mark as processed regardless of success to avoid spam
      await this.stateManager.markPostAsProcessed(postId);
      
    } catch (error) {
      this.logger.error(`❌ Error processing post ${postId}:`, error);
      // Still mark as processed to avoid retry loops
      await this.stateManager.markPostAsProcessed(postId);
    }
    
    return result;
  }

  generateComment(youtubeLinks) {
    const alternatives = youtubeLinks.map(link => {
      const yewtubeLink = this.youtubeDetector.convertToYewTube(link);
      return `🔒 Privacy-friendly alternative: ${yewtubeLink}`;
    });

    return `🤖 **Privacy-Friendly YouTube Alternative${youtubeLinks.length > 1 ? 's' : ''}**\n\n` +
           alternatives.join('\n\n') +
           '\n\n*Powered by [YewTuBot](https://github.com/YewTuBot) - Protecting your privacy, one link at a time* 🛡️';
  }

  async postToNostr(post, youtubeLinks) {
    try {
      const stackerNewsUrl = `https://stacker.news/items/${post.id}/r/YewTuBot`;
      const youtubeCount = youtubeLinks.length;
      
      const content = `🎥 Found ${youtubeCount} YouTube link${youtubeCount > 1 ? 's' : ''} on Stacker News!\n\n` +
                     `"${post.title}"\n\n` +
                     `Privacy-friendly alternatives available in the comments 🔒\n\n` +
                     `${stackerNewsUrl}\n\n` +
                     `#videostr #privacy #stackernews #yewtubot`;

      return await this.nostrClient.publishNote(content);
    } catch (error) {
      this.logger.error('Failed to post to Nostr:', error);
      return false;
    }
  }
}

// Run the bot
const bot = new YewTuBot();
bot.run().catch(error => {
  console.error('Bot crashed:', error);
  process.exit(1);
});
