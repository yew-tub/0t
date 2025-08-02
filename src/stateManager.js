import { Octokit } from '@octokit/rest';

export class StateManager {
  constructor(logger) {
    this.logger = logger;
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN
    });
    this.gistId = process.env.GIST_ID;
    this.processedPosts = new Set();
    this.fileName = 'yewtubot-processed-posts.json';
  }

  async initialize() {
    try {
      this.logger.info('💾 Initializing state manager...');
      
      if (!this.gistId) {
        this.logger.warn('⚠️  No GIST_ID provided - creating new gist...');
        await this.createNewGist();
      }

      await this.loadProcessedPosts();
      this.logger.info(`✅ State manager initialized with ${this.processedPosts.size} processed posts`);
      
    } catch (error) {
      this.logger.error('❌ Failed to initialize state manager:', error);
      throw error;
    }
  }

  async createNewGist() {
    try {
      const response = await this.octokit.gists.create({
        description: 'YewTuBot - Processed posts tracking',
        public: false,
        files: {
          [this.fileName]: {
            content: JSON.stringify({
              version: '1.0.0',
              created: new Date().toISOString(),
              processedPosts: [],
              stats: {
                totalProcessed: 0,
                totalDetected: 0,
                totalCommented: 0
              }
            }, null, 2)
          }
        }
      });

      this.gistId = response.data.id;
      this.logger.info(`✅ Created new gist: ${this.gistId}`);
      this.logger.warn('🔧 Please add this GIST_ID to your GitHub secrets: ' + this.gistId);
      
    } catch (error) {
      this.logger.error('❌ Failed to create new gist:', error);
      throw error;
    }
  }

  async loadProcessedPosts() {
    try {
      this.logger.debug('📥 Loading processed posts from gist...');
      
      const response = await this.octokit.gists.get({
        gist_id: this.gistId
      });

      const file = response.data.files[this.fileName];
      if (!file) {
        this.logger.info('📝 No processed posts file found, starting fresh');
        return;
      }

      const data = JSON.parse(file.content);
      const posts = data.processedPosts || [];
      
      this.processedPosts = new Set(posts);
      this.logger.debug(`📊 Loaded ${this.processedPosts.size} processed posts from gist`);
      
      // Clean up old posts (older than 7 days)
      await this.cleanupOldPosts(data);
      
    } catch (error) {
      this.logger.error('❌ Failed to load processed posts:', error);
      // Continue with empty set rather than failing
      this.processedPosts = new Set();
    }
  }

  async cleanupOldPosts(data) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const originalCount = this.processedPosts.size;
    
    // For now, we'll keep all posts as we don't have timestamp data
    // In future versions, we could store objects with timestamps
    
    if (originalCount !== this.processedPosts.size) {
      this.logger.info(`🧹 Cleaned up ${originalCount - this.processedPosts.size} old processed posts`);
    }
  }

  async hasProcessedPost(postId) {
    return this.processedPosts.has(postId.toString());
  }

  async markPostAsProcessed(postId) {
    const postIdStr = postId.toString();
    
    if (this.processedPosts.has(postIdStr)) {
      return; // Already processed
    }

    this.processedPosts.add(postIdStr);
    this.logger.debug(`✅ Marked post ${postId} as processed`);
    
    // Save to gist every 10 posts or immediately if it's the first post
    if (this.processedPosts.size % 10 === 1 || this.processedPosts.size <= 10) {
      await this.saveProcessedPosts();
    }
  }

  async saveProcessedPosts() {
    try {
      this.logger.debug('💾 Saving processed posts to gist...');
      
      const data = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        processedPosts: Array.from(this.processedPosts),
        stats: {
          totalProcessed: this.processedPosts.size,
          lastRun: new Date().toISOString()
        }
      };

      await this.octokit.gists.update({
        gist_id: this.gistId,
        files: {
          [this.fileName]: {
            content: JSON.stringify(data, null, 2)
          }
        }
      });

      this.logger.debug(`💾 Saved ${this.processedPosts.size} processed posts to gist`);
      
    } catch (error) {
      this.logger.error('❌ Failed to save processed posts:', error);
      // Don't throw error - continue execution
    }
  }

  async getStats() {
    return {
      processedPostsCount: this.processedPosts.size,
      gistId: this.gistId
    };
  }

  // Clean shutdown - save final state
  async shutdown() {
    try {
      await this.saveProcessedPosts();
      this.logger.info('💾 Final state saved successfully');
    } catch (error) {
      this.logger.error('❌ Failed to save final state:', error);
    }
  }
}
