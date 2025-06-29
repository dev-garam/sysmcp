import { GpuStatus, DetailedGpuStatus } from "./types.js";
export declare class GpuMonitor {
    getGpuStatus(): Promise<GpuStatus>;
    getDetailedGpuStatus(): Promise<DetailedGpuStatus>;
    private executeSystemProfilerGpu;
    private executeIoregGpu;
    private executeSmctempGpu;
    private executePowermetrics;
    private executeGpuProcesses;
    private parseGpuDetails;
    private parseGpuTemperature;
    private parsePowermetrics;
    private parseGpuProcesses;
    private getAccurateGpuMemory;
    private getThermalState;
}
