import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.logDir = 'logs';
    this.logFile = join(this.logDir, `yewtubot-${new Date().toISOString().split('T')[0]}.log`);
    
    // Create logs directory if it doesn't exist
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }
    
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
    
    this.currentLevel = this.levels[this.logLevel] || this.levels.info;
    
    // Start logging session
    this.log('info', '🚀 YewTuBot logging session started', { 
      timestamp: new Date().toISOString(),
      logLevel: this.logLevel,
      nodeVersion: process.version,
      platform: process.platform
    });
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase().padEnd(5);
    
    let formatted = `[${timestamp}] ${levelStr} ${message}`;
    
    if (data) {
      if (typeof data === 'object') {
        formatted += '\n' + JSON.stringify(data, null, 2);
      } else {
        formatted += ` ${data}`;
      }
    }
    
    return formatted;
  }

  log(level, message, data = null) {
    const levelNum = this.levels[level];
    
    if (levelNum === undefined || levelNum > this.currentLevel) {
      return;
    }
    
    const formatted = this.formatMessage(level, message, data);
    
    // Console output with colors
    const colors = {
      error: '\x1b[31m', // Red
      warn: '\x1b[33m',  // Yellow
      info: '\x1b[36m',  // Cyan
      debug: '\x1b[90m'  // Gray
    };
    
    const reset = '\x1b[0m';
    const coloredMessage = `${colors[level] || ''}${formatted}${reset}`;
    
    console.log(coloredMessage);
    
    // File output (without colors)
    try {
      writeFileSync(this.logFile, formatted + '\n', { flag: 'a' });
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  error(message, data = null) {
    this.log('error', message, data);
  }

  warn(message, data = null) {
    this.log('warn', message, data);
  }

  info(message, data = null) {
    this.log('info', message, data);
  }

  debug(message, data = null) {
    this.log('debug', message, data);
  }

  // Log performance metrics
  logPerformance(operation, startTime, additional = {}) {
    const duration = Date.now() - startTime;
    this.info(`⏱️  ${operation} completed in ${duration}ms`, {
      operation,
      duration,
      ...additional
    });
  }

  // Log API calls
  logApiCall(service, endpoint, method = 'GET', statusCode = null) {
    const message = `🌐 API ${method} ${service}${endpoint}`;
    const data = { service, endpoint, method, statusCode };
    
    if (statusCode >= 400) {
      this.error(message, data);
    } else {
      this.debug(message, data);
    }
  }

  // Log bot statistics
  logStats(stats) {
    this.info('📊 Bot Statistics', stats);
  }

  // Session end
  logSessionEnd(stats = {}) {
    this.info('🏁 YewTuBot session ended', {
      timestamp: new Date().toISOString(),
      duration: stats.duration || 'unknown',
      ...stats
    });
  }
}