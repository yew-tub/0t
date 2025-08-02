export class YouTubeDetector {
  constructor(logger) {
    this.logger = logger;
    
    // Comprehensive list of YouTube URL patterns
    this.youtubePatterns = [
      // Standard YouTube URLs
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/gi,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?.*[&?]v=([a-zA-Z0-9_-]{11})/gi,
      
      // YouTube short URLs
      /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/gi,
      
      // YouTube mobile URLs
      /(?:https?:\/\/)?m\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/gi,
      /(?:https?:\/\/)?m\.youtube\.com\/watch\?.*[&?]v=([a-zA-Z0-9_-]{11})/gi,
      
      // YouTube embed URLs
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/gi,
      
      // YouTube playlist URLs (extract video ID if present)
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/playlist\?.*[&?]v=([a-zA-Z0-9_-]{11})/gi,
      
      // YouTube Shorts
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/gi,
      
      // YouTube nocookie domain
      /(?:https?:\/\/)?(?:www\.)?youtube-nocookie\.com\/embed\/([a-zA-Z0-9_-]{11})/gi,
      
      // Gaming YouTube URLs
      /(?:https?:\/\/)?gaming\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/gi,
      
      // YouTube TV URLs
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/tv.*[&?]v=([a-zA-Z0-9_-]{11})/gi,
    ];
  }

  extractYouTubeLinks(title = '', text = '') {
    const content = `${title} ${text}`.toLowerCase();
    const foundLinks = [];
    const videoIds = new Set(); // Prevent duplicates

    this.logger.debug('🔍 Scanning content for YouTube links...');

    for (const pattern of this.youtubePatterns) {
      let match;
      
      // Reset regex index for global patterns
      pattern.lastIndex = 0;
      
      while ((match = pattern.exec(content)) !== null) {
        const videoId = match[1];
        
        if (videoId && !videoIds.has(videoId)) {
          videoIds.add(videoId);
          const originalUrl = match[0];
          foundLinks.push({
            originalUrl,
            videoId,
            fullMatch: match[0]
          });
          
          this.logger.debug(`🎥 Found YouTube video: ${videoId} (${originalUrl})`);
        }
      }
    }

    if (foundLinks.length > 0) {
      this.logger.info(`🎯 Detected ${foundLinks.length} unique YouTube video(s)`);
    }

    return foundLinks;
  }

  convertToYewTube(linkInfo) {
    const { videoId, originalUrl } = linkInfo;
    
    if (!videoId) {
      this.logger.warn(`⚠️  Cannot convert link - no video ID found: ${originalUrl}`);
      return originalUrl;
    }

    const yewtubeUrl = `https://yewtu.be/watch?v=${videoId}`;
    this.logger.debug(`🔄 Converting ${originalUrl} → ${yewtubeUrl}`);
    
    return yewtubeUrl;
  }

  // Helper method to validate YouTube video ID format
  isValidVideoId(videoId) {
    return /^[a-zA-Z0-9_-]{11}$/.test(videoId);
  }

  // Extract video ID from any YouTube URL
  extractVideoId(url) {
    for (const pattern of this.youtubePatterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(url);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  }

  // Get video thumbnail URL for yewtu.be
  getYewTubeThumbnail(videoId) {
    return `https://yewtu.be/vi/${videoId}/maxresdefault.jpg`;
  }

  // Generate multiple alternative privacy-friendly instances
  generateAlternatives(videoId) {
    const instances = [
      'yewtu.be',
      'invidio.us',
      'piped.video'
    ];

    return instances.map(instance => `https://${instance}/watch?v=${videoId}`);
  }

  // Check if content might contain YouTube links without full URL
  containsYouTubeIndicators(content) {
    const indicators = [
      /youtube/i,
      /youtu\.be/i,
      /watch\?v=/i,
      /\byt\b/i, // Common abbreviation
      /video/i
    ];

    return indicators.some(pattern => pattern.test(content));
  }
}