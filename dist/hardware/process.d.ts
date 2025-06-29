import { ProcessInfo, DetailedProcessStatus } from "./types.js";
export declare class ProcessMonitor {
    getProcessList(sortBy?: string, limit?: number): Promise<ProcessInfo[]>;
    getDetailedProcessStatus(): Promise<DetailedProcessStatus>;
    private executeDetailedPs;
    private executeDetailedTop;
    private executeLsofSummary;
    private executePstree;
    private parsePsSummary;
    private parseDetailedProcesses;
    private parseProcessTree;
    private analyzeSystemServices;
    private analyzeProcessSecurity;
    private analyzePerformanceImpact;
    private parseLsofSummary;
    private parseCpuTime;
    private isKnownProcess;
    private getSuspiciousReason;
    private getCpuRecommendation;
    private getMemoryRecommendation;
    private createBasicProcessStatus;
    private getEmptyPsSummary;
    private getEmptyTopProcesses;
}
