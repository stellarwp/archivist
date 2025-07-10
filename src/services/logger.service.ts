import { singleton } from 'tsyringe';
import { ConfigService } from './config.service';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogContext {
  [key: string]: any;
}

@singleton()
export class LoggerService {
  private isDebug: boolean = false;
  
  constructor(private configService: ConfigService) {
    // We'll check debug mode when config is available
  }
  
  private log(level: LogLevel, message: string, context?: LogContext): void {
    // Update debug mode from config if available
    try {
      this.isDebug = this.configService.isDebugMode();
    } catch {
      // Config not yet initialized
    }
    
    if (level === LogLevel.DEBUG && !this.isDebug) {
      return;
    }
    
    const timestamp = new Date().toISOString();
    const levelStr = LogLevel[level];
    
    const logEntry = {
      timestamp,
      level: levelStr,
      message,
      ...context,
    };
    
    switch (level) {
      case LogLevel.ERROR:
        console.error(`[${levelStr}] ${message}`, context || '');
        break;
      case LogLevel.WARN:
        console.warn(`[${levelStr}] ${message}`, context || '');
        break;
      case LogLevel.DEBUG:
        console.log(`[${levelStr}] ${message}`, context || '');
        break;
      default:
        console.log(message);
    }
  }
  
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }
  
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }
  
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }
  
  error(message: string, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context);
  }
  
  // Progress logging for crawling
  progress(current: number, total: number, message: string): void {
    console.log(`[${current}/${total}] ${message}`);
  }
  
  // Section header for better readability
  section(title: string): void {
    console.log(`\n${title}`);
    console.log('='.repeat(title.length));
  }
  
  // List items
  list(items: string[]): void {
    items.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item}`);
    });
  }
}