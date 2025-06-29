/**
 * 간단한 콘솔 로거
 */
export declare class Logger {
    private static getTimestamp;
    private static formatMessage;
    static info(message: string, data?: any): void;
    static warn(message: string, data?: any): void;
    static error(message: string, error?: any): void;
    static debug(message: string, data?: any): void;
    static trace(operation: string, startTime: number): void;
}
