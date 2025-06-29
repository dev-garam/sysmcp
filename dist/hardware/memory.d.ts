import { MemoryStatus, DetailedMemoryStatus } from "./types.js";
export declare class MemoryMonitor {
    getMemoryStatus(): Promise<MemoryStatus>;
    getDetailedMemoryStatus(): Promise<DetailedMemoryStatus>;
    private executeVmStat;
    private executeMemoryPressure;
    private parseVmStat;
    private parseVmStatForBasicMemory;
    private parseMemoryPressure;
}
