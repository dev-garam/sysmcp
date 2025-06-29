/**
 * 간단한 콘솔 로거
 */
export class Logger {
  private static getTimestamp(): string {
    return new Date().toISOString();
  }

  private static formatMessage(level: string, message: string, data?: any): string {
    const timestamp = this.getTimestamp();
    const baseMsg = `[${timestamp}] [${level}] ${message}`;
    
    if (data) {
      return `${baseMsg} ${JSON.stringify(data)}`;
    }
    return baseMsg;
  }

  static info(message: string, data?: any): void {
    console.log(this.formatMessage('INFO', message, data));
  }

  static warn(message: string, data?: any): void {
    console.warn(this.formatMessage('WARN', message, data));
  }

  static error(message: string, error?: any): void {
    const errorData = error instanceof Error ? {
      message: error.message,
      stack: error.stack
    } : error;
    
    console.error(this.formatMessage('ERROR', message, errorData));
  }

  static debug(message: string, data?: any): void {
    if (process.env.NODE_ENV !== 'production') {
      console.log(this.formatMessage('DEBUG', message, data));
    }
  }

  static trace(operation: string, startTime: number): void {
    const duration = Date.now() - startTime;
    this.debug(`${operation} completed in ${duration}ms`);
  }
} 