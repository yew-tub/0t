import fetch from 'node-fetch';

export class StackerNewsClient {
  constructor(logger) {
    this.logger = logger;
    this.apiUrl = 'https://stacker.news/api/graphql';
    this.token = process.env.STACKER_NEWS_TOKEN;
  }

  async graphqlRequest(query, variables = {}) {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // ADD DEBUG LOGS HERE
    this.logger.debug('GraphQL Query:', query);
    this.logger.debug('GraphQL Variables:', variables);
    this.logger.debug('Request Headers:', headers);

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query,
        variables
      })
    });

    // ADD RESPONSE DEBUG INFO
    this.logger.debug('Response Status:', response.status, response.statusText);
    
    if (!response.ok) {
      // Get response text for better error debugging
      const responseText = await response.text();
      this.logger.error('Response Body:', responseText);
      throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // ADD RESPONSE DATA DEBUG
    this.logger.debug('Response Data:', JSON.stringify(data, null, 2));
    
    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    return data.data;
  }

  async getRecentPosts(limit = 50) {
    const query = `
      query RecentPosts($sort: String!, $when: String!, $limit: Int!) {
        items(sort: $sort, when: $when, limit: $limit) {
          items {
            id
            title
            text
            url
            createdAt
            ncomments
            sats
            user {
              name
              id
            }
            sub {
              name
            }
          }
        }
      }
    `;

    try {
      this.logger.debug('🔄 Fetching recent posts from Stacker News API...');
      const data = await this.graphqlRequest(query, {
        sort: 'recent',
        when: 'day',
        limit
      });

      const posts = data.items?.items || [];
      this.logger.debug(`📊 Retrieved ${posts.length} recent posts`);
      
      // Filter posts from the last 30 minutes to avoid processing old posts
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const recentPosts = posts.filter(post => 
        new Date(post.createdAt) > thirtyMinutesAgo
      );

      this.logger.info(`🕐 Found ${recentPosts.length} posts from the last 30 minutes`);
      return recentPosts;

    } catch (error) {
      this.logger.error('❌ Failed to fetch recent posts:', error);
      this.logger.error('Full error details:', error);
      throw error;
    }
  }

  async postComment(itemId, text) {
    const mutation = `
      mutation CreateComment($text: String!, $parentId: ID!) {
        upsertComment(text: $text, parentId: $parentId) {
          id
          text
          createdAt
        }
      }
    `;

    try {
      this.logger.debug(`💬 Posting comment to item ${itemId}...`);
      
      if (!this.token) {
        this.logger.warn('⚠️  No Stacker News token provided - comment posting disabled');
        return false;
      }

      const data = await this.graphqlRequest(mutation, {
        text,
        parentId: itemId
      });

      if (data.upsertComment) {
        this.logger.info(`✅ Comment posted successfully: ${data.upsertComment.id}`);
        return true;
      }

      this.logger.warn('⚠️  Comment creation returned no data');
      return false;

    } catch (error) {
      this.logger.error(`❌ Failed to post comment to item ${itemId}:`, error);
      return false;
    }
  }

  async getRecentPostsSimple(limit = 20) {
    // Simplified query without parameters that might cause issues
    const query = `
      query {
        items(sort: "recent") {
          items {
            id
            title
            text
            url
            createdAt
            user {
              name
            }
          }
        }
      }
    `;

    try {
      this.logger.debug('🔄 Fetching posts with simple query...');
      const data = await this.graphqlRequest(query);

      const posts = data.items?.items || [];
      this.logger.debug(`📊 Retrieved ${posts.length} posts with simple query`);
      
      // Take only the most recent posts and filter by time
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const recentPosts = posts
        .filter(post => new Date(post.createdAt) > thirtyMinutesAgo)
        .slice(0, limit);

      this.logger.info(`🕐 Found ${recentPosts.length} recent posts with fallback method`);
      return recentPosts;

    } catch (error) {
      this.logger.error('❌ Fallback query also failed:', error);
      // Return empty array rather than throwing to allow bot to continue
      return [];
    }
  }
}
