import { CpuStatus, DetailedCpuStatus } from "./types.js";
export declare class CpuMonitor {
    getCpuStatus(): Promise<CpuStatus>;
    getDetailedCpuStatus(): Promise<DetailedCpuStatus>;
    private getLoadAverage;
    private executeSysctlCpu;
    private executeTemperatureSensors;
    private executePowermetrics;
    private executeIostat;
    private parseCpuDetails;
    private parseTemperatures;
    private parsePowermetrics;
    private parseIostat;
}
