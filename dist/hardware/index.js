// 하드웨어 모니터 클래스들 내보내기
export { CpuMonitor } from "./cpu.js";
export { MemoryMonitor } from "./memory.js";
export { GpuMonitor } from "./gpu.js";
export { NetworkMonitor } from "./network.js";
export { DiskMonitor } from "./disk.js";
export { ProcessMonitor } from "./process.js";
// 타입들 내보내기
export * from "./types.js";
// 통합 시스템 모니터 클래스
import { CpuMonitor } from "./cpu.js";
import { MemoryMonitor } from "./memory.js";
import { GpuMonitor } from "./gpu.js";
import { NetworkMonitor } from "./network.js";
import { DiskMonitor } from "./disk.js";
import { ProcessMonitor } from "./process.js";
import { Logger } from "../logger.js";
export class SystemMonitor {
    cpuMonitor;
    memoryMonitor;
    gpuMonitor;
    networkMonitor;
    diskMonitor;
    processMonitor;
    constructor() {
        this.cpuMonitor = new CpuMonitor();
        this.memoryMonitor = new MemoryMonitor();
        this.gpuMonitor = new GpuMonitor();
        this.networkMonitor = new NetworkMonitor();
        this.diskMonitor = new DiskMonitor();
        this.processMonitor = new ProcessMonitor();
    }
    // 기본 시스템 상태 조회 (모든 하드웨어 포함)
    async getSystemOverview(includeAnalysis = true) {
        const startTime = Date.now();
        Logger.info('전체 시스템 상태 조회 시작');
        try {
            // 모든 기본 정보를 병렬로 수집
            const [cpuStatus, memoryStatus, gpuStatus, networkStatus, diskStatus, processList] = await Promise.all([
                this.cpuMonitor.getCpuStatus(),
                this.memoryMonitor.getMemoryStatus(),
                this.gpuMonitor.getGpuStatus(),
                this.networkMonitor.getNetworkStatus(),
                this.diskMonitor.getDiskStatus(),
                this.processMonitor.getProcessList('cpu', 10)
            ]);
            const overview = {
                timestamp: Date.now(),
                cpu: cpuStatus,
                memory: memoryStatus,
                gpu: gpuStatus,
                network: networkStatus,
                disk: diskStatus,
                processes: processList
            };
            // 성능 분석 추가
            if (includeAnalysis) {
                const analysis = this.analyzeSystemPerformance(overview);
                Object.assign(overview, { analysis });
            }
            Logger.info('전체 시스템 상태 조회 완료', {
                cpuUsage: overview.cpu.usage + '%',
                memoryUsage: overview.memory.usagePercent + '%',
                gpuCount: overview.gpu.controllers.length,
                activeProcesses: overview.processes.length
            });
            Logger.trace('getSystemOverview', startTime);
            return overview;
        }
        catch (error) {
            Logger.error('시스템 전체 상태 조회 실패', error);
            throw error;
        }
    }
    // 개별 하드웨어 모니터 접근
    get cpu() { return this.cpuMonitor; }
    get memory() { return this.memoryMonitor; }
    get gpu() { return this.gpuMonitor; }
    get network() { return this.networkMonitor; }
    get disk() { return this.diskMonitor; }
    get process() { return this.processMonitor; }
    // 성능 병목지점 분석
    analyzeSystemPerformance(overview) {
        const bottlenecks = [];
        const recommendations = [];
        let overallScore = 100;
        // CPU 분석
        if (overview.cpu.usage > 80) {
            bottlenecks.push('High CPU usage detected');
            recommendations.push('CPU 사용률이 높습니다. 백그라운드 프로세스를 확인하세요.');
            overallScore -= 20;
        }
        else if (overview.cpu.usage > 60) {
            recommendations.push('CPU 사용률 모니터링을 권장합니다.');
            overallScore -= 10;
        }
        // 메모리 분석
        if (overview.memory.usagePercent > 90) {
            bottlenecks.push('Critical memory usage');
            recommendations.push('메모리 사용률이 매우 높습니다. 불필요한 애플리케이션을 종료하세요.');
            overallScore -= 25;
        }
        else if (overview.memory.usagePercent > 75) {
            bottlenecks.push('High memory usage');
            recommendations.push('메모리 사용률이 높습니다. 메모리 정리를 고려하세요.');
            overallScore -= 15;
        }
        // GPU 분석 (GPU가 있는 경우)
        if (overview.gpu.controllers.length > 0) {
            const gpu = overview.gpu.controllers[0];
            if (gpu.utilizationGpu && gpu.utilizationGpu > 90) {
                bottlenecks.push('High GPU usage');
                recommendations.push('GPU 사용률이 높습니다. 그래픽 집약적 작업을 확인하세요.');
                overallScore -= 15;
            }
        }
        // 디스크 분석
        for (const disk of overview.disk.disks) {
            if (disk.usagePercent > 95) {
                bottlenecks.push(`Disk ${disk.device} almost full`);
                recommendations.push(`디스크 ${disk.device}의 공간이 부족합니다. 파일 정리가 필요합니다.`);
                overallScore -= 20;
            }
            else if (disk.usagePercent > 85) {
                recommendations.push(`디스크 ${disk.device}의 공간을 확인하세요.`);
                overallScore -= 10;
            }
        }
        // 프로세스 분석
        const highCpuProcesses = overview.processes.filter((p) => p.cpu > 20);
        if (highCpuProcesses.length > 0) {
            recommendations.push(`높은 CPU 사용률 프로세스: ${highCpuProcesses.map((p) => p.name).join(', ')}`);
        }
        const performance = overallScore >= 90 ? 'excellent' :
            overallScore >= 75 ? 'good' :
                overallScore >= 60 ? 'moderate' :
                    overallScore >= 40 ? 'poor' : 'critical';
        return {
            performance,
            score: overallScore,
            bottlenecks,
            recommendations,
            timestamp: Date.now()
        };
    }
}
