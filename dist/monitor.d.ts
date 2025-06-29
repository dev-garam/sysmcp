export declare class Monitor {
    getCpuStatus(): Promise<import("./hardware/types.js").CpuStatus>;
    getDetailedCpuStatus(): Promise<import("./hardware/types.js").DetailedCpuStatus>;
    getMemoryStatus(): Promise<import("./hardware/types.js").MemoryStatus>;
    getDetailedMemoryStatus(): Promise<import("./hardware/types.js").DetailedMemoryStatus>;
    getGpuStatus(): Promise<import("./hardware/types.js").GpuStatus>;
    getDetailedGpuStatus(): Promise<import("./hardware/types.js").DetailedGpuStatus>;
    getNetworkStatus(): Promise<import("./hardware/types.js").NetworkStatus>;
    getDetailedNetworkStatus(): Promise<import("./hardware/types.js").DetailedNetworkStatus>;
    getDiskStatus(): Promise<import("./hardware/types.js").DiskStatus>;
    getProcessList(sortBy?: string, limit?: number): Promise<import("./hardware/types.js").ProcessInfo[]>;
    getDetailedProcessStatus(): Promise<import("./hardware/types.js").DetailedProcessStatus>;
    getSystemOverview(includeAnalysis?: boolean): Promise<import("./hardware/types.js").SystemOverview>;
    get cpu(): import("./hardware/cpu.js").CpuMonitor;
    get memory(): import("./hardware/memory.js").MemoryMonitor;
    get gpu(): import("./hardware/gpu.js").GpuMonitor;
    get network(): import("./hardware/network.js").NetworkMonitor;
    get disk(): import("./hardware/disk.js").DiskMonitor;
    get process(): import("./hardware/process.js").ProcessMonitor;
}
