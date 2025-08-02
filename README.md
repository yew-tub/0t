# YewTuBot 🤖

An automated bot that runs on GitHub Actions to convert YouTube links on Stacker News to privacy-friendly alternatives and cross-posts to Nostr.

## Features

- 🔍 **Monitors Stacker News** - Fetches recent posts every 21 minutes via GraphQL API
- 🎥 **YouTube Link Detection** - Detects various YouTube URL formats including shorts, embeds, and mobile links  
- 🔒 **Privacy-Friendly Alternatives** - Converts YouTube links to yewtu.be alternatives
- 💬 **Automated Comments** - Posts helpful comments with alternative links
- 📡 **Nostr Integration** - Cross-posts findings to Nostr with #videostr hashtag
- 💾 **State Management** - Tracks processed posts using GitHub Gist to avoid duplicates
- 📊 **Comprehensive Logging** - Detailed logs for monitoring and debugging

## Setup Instructions

### 1. Fork this Repository

Fork this repository to your GitHub account.

### 2. Create Required Secrets

Go to your repository's Settings → Secrets and variables → Actions, and add these secrets:

#### Required Secrets:
- `NOSTR_NSEC` - Your Nostr private key (nsec1... format)
- `NOSTR_NPUB` - Your Nostr public key (npub1... format) 
- `GITHUB_TOKEN` - GitHub personal access token with gist permissions
- `GIST_ID` - GitHub Gist ID for storing processed posts (leave empty on first run)

#### Optional Secrets:
- `STACKER_NEWS_TOKEN` - Your Stacker News API token (for posting comments)

### 3. GitHub Token Setup

1. Go to [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. Generate a new token (classic) with these scopes:
   - `gist` (create, update, and delete gists)
3. Add the token as `GITHUB_TOKEN` secret

### 4. Nostr Keys Setup

Generate your Nostr keys if you don't have them:

```bash
# Using nak CLI tool
npx @nostrband/nak key generate

# Or use any Nostr client to generate keys
```

Add both `NOSTR_NSEC` (private key) and `NOSTR_NPUB` (public key) to secrets.

### 5. Stacker News Token (Optional)

1. Login to [Stacker News](https://stacker.news)
2. Go to Settings → API
3. Generate a new API token
4. Add as `STACKER_NEWS_TOKEN` secret

**Note:** Without this token, the bot will only detect and log YouTube links but won't post comments.

### 6. First Run

1. Go to Actions tab in your repository
2. Click "YewTuBot - YouTube Link Converter"
3. Click "Run workflow" to trigger manually
4. Check the logs - if `GIST_ID` was empty, the bot will create a new gist and log the ID
5. Add the generated Gist ID to your secrets as `GIST_ID`

## Configuration

### Scheduling

The bot runs every 21 minutes by default. To change this, edit `.github/workflows/yewtubot.yml`:

```yaml
schedule:
  - cron: '*/21 * * * *'  # Change to your preferred interval
```

### Log Level

Set log verbosity by adding `LOG_LEVEL` environment variable:
- `error` - Only errors
- `warn` - Warnings and errors  
- `info` - General information (default)
- `debug` - Detailed debugging info

## Supported YouTube URL Formats

The bot detects various YouTube URL formats:

- Standard: `youtube.com/watch?v=VIDEO_ID`
- Short: `youtu.be/VIDEO_ID`
- Mobile: `m.youtube.com/watch?v=VIDEO_ID`
- Embed: `youtube.com/embed/VIDEO_ID`
- Shorts: `youtube.com/shorts/VIDEO_ID`
- Playlist with video: `youtube.com/playlist?v=VIDEO_ID`
- No-cookie: `youtube-nocookie.com/embed/VIDEO_ID`

## File Structure

```
├── .github/workflows/yewtubot.yml  # GitHub Actions workflow
├── src/
│   ├── bot.js                      # Main bot logic
│   ├── stackerNewsClient.js        # Stacker News API client
│   ├── nostrClient.js              # Nostr protocol client
│   ├── youtubeDetector.js          # YouTube link detection
│   ├── stateManager.js             # State persistence via Gist
│   └── logger.js                   # Logging utility
├── logs/                           # Generated log files
├── package.json                    # Dependencies
└── README.md                       # This file
```

## Monitoring

### GitHub Actions Logs
- Go to Actions tab → Latest workflow run
- Check logs for each step
- Download log artifacts for detailed debugging

### Log Files
- Logs are uploaded as artifacts after each run
- Daily log files: `yewtubot-YYYY-MM-DD.log`
- Retention: 7 days

### Gist State Tracking
- Check your gist to see processed posts
- Contains statistics and last run timestamp
- Automatic cleanup of old entries

## Troubleshooting

### Common Issues

1. **"NOSTR_NSEC environment variable is required"**
   - Add your Nostr private key to GitHub secrets

2. **"GraphQL request failed: 401"**
   - Check your Stacker News API token
   - Token might be expired or invalid

3. **"Failed to create new gist"**
   - Verify GitHub token has `gist` permission
   - Check token hasn't expired

4. **Bot not finding YouTube links**
   - Check recent posts on Stacker News
   - Ensure posts are less than 30 minutes old
   - Enable debug logging to see detection details

### Debug Mode

Enable debug logging by adding to workflow:

```yaml
env:
  LOG_LEVEL: debug
```

## Privacy & Security

- Private keys are stored securely in GitHub Secrets
- Bot only reads public Stacker News posts
- Gist storage is private by default
- No personal data is collected or stored

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with your own setup
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Enhancements & Future Features

### Suggested Improvements

1. **Multiple Privacy Instances**
   - Support for invidio.us, piped.video alternatives
   - Load balancing across instances
   - Instance health checking

2. **Content Analysis**  
   - Video title/description fetching
   - Duration and quality information
   - Thumbnail preview in comments

3. **User Preferences**
   - Allow users to opt-out via replies
   - Customizable comment templates
   - User-specific alternative preferences

4. **Advanced Detection**
   - Embedded video detection in articles
   - Podcast/audio content support
   - Other video platform support (Vimeo, etc.)

5. **Analytics & Reporting**
   - Daily/weekly summary posts
   - Most active video posters
   - Privacy conversion statistics

6. **Integration Enhancements**
   - Stacker News boost/tip integration
   - Cross-posting to other platforms
   - RSS feed generation

7. **Performance Optimizations**
   - Incremental processing
   - Webhook support for real-time processing
   - Caching layer for repeated content

## Support

For issues and questions:
- Open GitHub Issues for bugs/features
- Check Actions logs for debugging
- Review README for setup instructions

---

*YewTuBot - Protecting privacy, one video link at a time* 🛡️