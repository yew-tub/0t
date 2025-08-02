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

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query,
        variables
      })
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    return data.data;
  }

  async getRecentPosts(limit = 50) {
    const query = `
      query RecentPosts($sort: String!, $limit: Int!) {
        items(sort: $sort, limit: $limit) {
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

  async getItemDetails(itemId) {
    const query = `
      query GetItem($id: ID!) {
        item(id: $id) {
          id
          title
          text
          url
          createdAt
          user {
            name
          }
          comments {
            id
            text
            user {
              name
            }
          }
        }
      }
    `;

    try {
      const data = await this.graphqlRequest(query, { id: itemId });
      return data.item;
    } catch (error) {
      this.logger.error(`❌ Failed to get item details for ${itemId}:`, error);
      return null;
    }
  }
}
