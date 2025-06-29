export interface CpuStatus {
    usage: number;
    cores: number;
    speed: number;
    temperature?: number;
    loadAverage: number[];
    model: string;
}
export interface DetailedCpuStatus extends CpuStatus {
    performanceCores?: number;
    efficiencyCores?: number;
    physicalCores?: number;
    logicalCores?: number;
    temperatures?: {
        cpu: number;
        cores: number[];
        max: number;
        sensors: {
            [key: string]: number;
        };
    };
    power?: {
        packagePower?: number;
        cpuPower?: number;
        gpuPower?: number;
        anePower?: number;
    };
    frequencies?: {
        base: number;
        boost: number;
        current: number[];
        avg: number;
    };
    coreUsage?: number[];
    scheduler?: {
        runQueue: number;
        contextSwitches: number;
        interrupts: number;
    };
}
export interface MemoryStatus {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
    available: number;
    swapTotal: number;
    swapUsed: number;
}
export interface DetailedMemoryStatus extends MemoryStatus {
    appMemory?: number;
    wiredMemory?: number;
    compressedMemory?: number;
    cachedFiles?: number;
    memoryPressure?: string;
    details?: {
        pageSize: number;
        pagesActive: number;
        pagesInactive: number;
        pagesWired: number;
        pagesCompressed: number;
        pagesFree: number;
        swapIns: number;
        swapOuts: number;
    };
}
export interface GpuStatus {
    controllers: Array<{
        model: string;
        vendor: string;
        vram?: number;
        memoryUsed?: number;
        memoryTotal?: number;
        utilizationGpu?: number;
        temperatureGpu?: number;
    }>;
}
export interface DetailedGpuStatus extends GpuStatus {
    details?: {
        chipset: string;
        totalCores: number;
        metalSupport: string;
        utilization: {
            overall: number;
            perCore?: number[];
            performanceState: number;
            frequencyMHz?: number;
        };
        memory: {
            totalMB: number;
            usedMB: number;
            freeMB: number;
            cachedMB?: number;
            utilizationPercent: number;
            totalUtilizationPercent?: number;
            bandwidth?: number;
        };
        thermal: {
            temperature: number;
            thermalState?: string;
            fanSpeed?: number;
        };
        power: {
            usage: number;
            maxPower?: number;
            efficiency?: number;
        };
        activeProcesses?: Array<{
            pid: number;
            name: string;
            commandQueueCount: number;
            accumulatedGpuTime: number;
            api: string;
        }>;
        throttling?: {
            isThrottling: boolean;
            reason?: string;
            throttlePercent?: number;
        };
        performanceHistory?: {
            avgUtilization: number;
            peakUtilization: number;
            thermalEvents: number;
        };
    };
}
export interface NetworkStatus {
    interfaces: Array<{
        iface: string;
        ip4: string;
        ip6: string;
        mac: string;
        speed: number;
        operstate: string;
    }>;
    stats: Array<{
        iface: string;
        rx_bytes: number;
        tx_bytes: number;
        rx_sec: number;
        tx_sec: number;
    }>;
}
export interface DetailedNetworkStatus extends NetworkStatus {
    realTimeStats?: {
        activeInterface: string;
        currentBandwidth: {
            download: number;
            upload: number;
            total: number;
        };
        history: Array<{
            timestamp: number;
            downloadMbps: number;
            uploadMbps: number;
            totalMbps: number;
        }>;
        peaks: {
            maxDownload: number;
            maxUpload: number;
            avgDownload: number;
            avgUpload: number;
        };
    };
    connectionAnalysis?: {
        activeConnections: number;
        establishedConnections: number;
        listeningPorts: number;
        topConnections: Array<{
            pid: number;
            processName: string;
            localAddress: string;
            remoteAddress: string;
            bytesIn: number;
            bytesOut: number;
            state: string;
            protocol: string;
        }>;
        protocolStats: {
            tcp: {
                connections: number;
                bytesIn: number;
                bytesOut: number;
            };
            udp: {
                connections: number;
                bytesIn: number;
                bytesOut: number;
            };
            other: {
                connections: number;
                bytesIn: number;
                bytesOut: number;
            };
        };
    };
    wifiDetails?: {
        ssid: string;
        signalStrength: number;
        signalQuality: number;
        channel: number;
        frequency: number;
        linkSpeed: number;
        security: string;
        transmitRate: number;
        receiveRate: number;
    };
    qualityMetrics?: {
        latency: number;
        jitter: number;
        packetLoss: number;
        bandwidth: number;
        dnsResolutionTime: number;
    };
    interfaceDetails?: Array<{
        iface: string;
        type: string;
        mtu: number;
        duplex: string;
        carrier: boolean;
        packets: {
            rxPackets: number;
            txPackets: number;
            rxErrors: number;
            txErrors: number;
            rxDropped: number;
            txDropped: number;
        };
        throughput: {
            currentRx: number;
            currentTx: number;
            avgRx: number;
            avgTx: number;
        };
    }>;
}
export interface DiskStatus {
    disks: Array<{
        device: string;
        type: string;
        size: number;
        used: number;
        available: number;
        usagePercent: number;
        mount: string;
    }>;
    io: {
        reads: number;
        writes: number;
        readBytes: number;
        writeBytes: number;
    };
}
export interface ProcessInfo {
    pid: number;
    name: string;
    cpu: number;
    memory: number;
    memoryPercent: number;
}
export interface DetailedProcessStatus {
    summary: {
        totalProcesses: number;
        runningProcesses: number;
        sleepingProcesses: number;
        zombieProcesses: number;
        totalThreads: number;
    };
    topProcesses: {
        byCpu: Array<{
            pid: number;
            ppid: number;
            name: string;
            command: string;
            user: string;
            cpu: number;
            memory: number;
            memoryPercent: number;
            memoryDetails: {
                rss: number;
                vsz: number;
                shared: number;
                private: number;
            };
            timeInfo: {
                cpuTime: string;
                startTime: number;
                runTime: number;
            };
            resources: {
                threads: number;
                fileDescriptors: number;
                openFiles: number;
                ports: number;
            };
            status: {
                state: string;
                priority: number;
                nice: number;
                contextSwitches: number;
            };
        }>;
        byMemory: Array<{
            pid: number;
            name: string;
            memory: number;
            memoryPercent: number;
            cpu: number;
            user: string;
        }>;
        byFileDescriptors: Array<{
            pid: number;
            name: string;
            fileDescriptors: number;
            openFiles: number;
            user: string;
        }>;
    };
    processTree?: {
        topParents: Array<{
            pid: number;
            name: string;
            childCount: number;
            totalCpuUsage: number;
            totalMemoryUsage: number;
            children: Array<{
                pid: number;
                name: string;
                cpu: number;
                memory: number;
            }>;
        }>;
    };
    systemServices?: {
        criticalServices: Array<{
            name: string;
            pid: number;
            status: 'running' | 'stopped' | 'error';
            cpu: number;
            memory: number;
            restarts: number;
        }>;
        heavyServices: Array<{
            name: string;
            pid: number;
            cpu: number;
            memory: number;
            impact: 'high' | 'medium' | 'low';
        }>;
    };
    securityAnalysis?: {
        rootProcesses: Array<{
            pid: number;
            name: string;
            command: string;
            cpu: number;
            memory: number;
        }>;
        suspiciousProcesses: Array<{
            pid: number;
            name: string;
            reason: string;
            cpu: number;
            memory: number;
            fileDescriptors: number;
        }>;
    };
    performanceImpact?: {
        cpuBottlenecks: Array<{
            pid: number;
            name: string;
            cpu: number;
            impact: number;
            recommendation: string;
        }>;
        memoryBottlenecks: Array<{
            pid: number;
            name: string;
            memory: number;
            memoryPercent: number;
            impact: number;
            recommendation: string;
        }>;
        ioIntensiveProcesses: Array<{
            pid: number;
            name: string;
            fileDescriptors: number;
            diskReads: number;
            diskWrites: number;
            networkConnections: number;
        }>;
    };
}
export interface SystemOverview {
    timestamp: number;
    cpu: CpuStatus;
    memory: MemoryStatus;
    gpu: GpuStatus;
    network: NetworkStatus;
    disk: DiskStatus;
    processes: ProcessInfo[];
    analysis?: {
        performance: string;
        score: number;
        bottlenecks: string[];
        recommendations: string[];
        timestamp: number;
    };
}
