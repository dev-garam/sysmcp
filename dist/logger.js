/**
 * 간단한 콘솔 로거
 */
export class Logger {
    static getTimestamp() {
        return new Date().toISOString();
    }
    static formatMessage(level, message, data) {
        const timestamp = this.getTimestamp();
        const baseMsg = `[${timestamp}] [${level}] ${message}`;
        if (data) {
            return `${baseMsg} ${JSON.stringify(data)}`;
        }
        return baseMsg;
    }
    static info(message, data) {
        console.log(this.formatMessage('INFO', message, data));
    }
    static warn(message, data) {
        console.warn(this.formatMessage('WARN', message, data));
    }
    static error(message, error) {
        const errorData = error instanceof Error ? {
            message: error.message,
            stack: error.stack
        } : error;
        console.error(this.formatMessage('ERROR', message, errorData));
    }
    static debug(message, data) {
        if (process.env.NODE_ENV !== 'production') {
            console.log(this.formatMessage('DEBUG', message, data));
        }
    }
    static trace(operation, startTime) {
        const duration = Date.now() - startTime;
        this.debug(`${operation} completed in ${duration}ms`);
    }
}
