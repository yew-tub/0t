import { YouTubeDetector } from './youtubeDetector.js';
import { Logger } from './logger.js';

// Test the YouTube detection functionality
class BotTester {
  constructor() {
    this.logger = new Logger();
    this.detector = new YouTubeDetector(this.logger);
  }

  runTests() {
    console.log('🧪 Running YewTuBot Tests\n');

    this.testYouTubeDetection();
    this.testLinkConversion();
    this.testEdgeCases();

    console.log('\n✅ All tests completed!');
  }

  testYouTubeDetection() {
    console.log('🔍 Testing YouTube Link Detection...\n');

    const testCases = [
      {
        name: 'Standard YouTube URL',
        content: 'Check out this video: https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        expected: 1
      },
      {
        name: 'Short YouTube URL',
        content: 'Great video: https://youtu.be/dQw4w9WgXcQ',
        expected: 1
      },
      {
        name: 'Mobile YouTube URL',
        content: 'Watch on mobile: https://m.youtube.com/watch?v=dQw4w9WgXcQ',
        expected: 1
      },
      {
        name: 'YouTube Shorts',
        content: 'Short video: https://www.youtube.com/shorts/dQw4w9WgXcQ',
        expected: 1
      },
      {
        name: 'Embed URL',
        content: 'Embedded: https://www.youtube.com/embed/dQw4w9WgXcQ',
        expected: 1
      },
      {
        name: 'Multiple URLs',
        content: 'Two videos: https://youtu.be/abc12345678 and https://youtube.com/watch?v=def12345678',
        expected: 2
      },
      {
        name: 'No YouTube Links',
        content: 'This is just text about videos but no links',
        expected: 0
      },
      {
        name: 'URL with additional parameters',
        content: 'Video with timestamp: https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s',
        expected: 1
      }
    ];

    testCases.forEach((testCase, index) => {
      const links = this.detector.extractYouTubeLinks('', testCase.content);
      const passed = links.length === testCase.expected;
      
      console.log(`  ${index + 1}. ${testCase.name}: ${passed ? '✅' : '❌'}`);
      if (!passed) {
        console.log(`     Expected: ${testCase.expected}, Got: ${links.length}`);
        console.log(`     Content: "${testCase.content}"`);
        console.log(`     Found: ${JSON.stringify(links, null, 2)}`);
      }
    });
  }

  testLinkConversion() {
    console.log('\n🔄 Testing Link Conversion...\n');

    const testLinks = [
      {
        originalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        videoId: 'dQw4w9WgXcQ'
      },
      {
        originalUrl: 'https://youtu.be/abc12345678',
        videoId: 'abc12345678'
      }
    ];

    testLinks.forEach((linkInfo, index) => {
      const converted = this.detector.convertToYewTube(linkInfo);
      const expected = `https://yewtu.be/watch?v=${linkInfo.videoId}`;
      const passed = converted === expected;
      
      console.log(`  ${index + 1}. Convert ${linkInfo.originalUrl}: ${passed ? '✅' : '❌'}`);
      if (!passed) {
        console.log(`     Expected: ${expected}`);
        console.log(`     Got: ${converted}`);
      }
    });
  }

  testEdgeCases() {
    console.log('\n🎯 Testing Edge Cases...\n');

    const edgeCases = [
      {
        name: 'Invalid video ID',
        content: 'Bad URL: https://www.youtube.com/watch?v=invalid',
        expected: 0 // Should not match invalid video ID
      },
      {
        name: 'Case insensitive',
        content: 'YOUTUBE.COM/WATCH?V=dQw4w9WgXcQ',
        expected: 1
      },
      {
        name: 'URL in title and text',
        title: 'Great video: https://youtu.be/dQw4w9WgXcQ',
        content: 'Also check: https://youtu.be/abc12345678',
        expected: 2
      },
      {
        name: 'Same video ID multiple times',
        content: 'https://youtu.be/dQw4w9WgXcQ and https://youtube.com/watch?v=dQw4w9WgXcQ',
        expected: 1 // Should deduplicate
      }
    ];

    edgeCases.forEach((testCase, index) => {
      const links = this.detector.extractYouTubeLinks(
        testCase.title || '', 
        testCase.content || ''
      );
      const passed = links.length === testCase.expected;
      
      console.log(`  ${index + 1}. ${testCase.name}: ${passed ? '✅' : '❌'}`);
      if (!passed) {
        console.log(`     Expected: ${testCase.expected}, Got: ${links.length}`);
        if (testCase.title) console.log(`     Title: "${testCase.title}"`);
        if (testCase.content) console.log(`     Content: "${testCase.content}"`);
      }
    });
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new BotTester();
  tester.runTests();
}