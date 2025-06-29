// SystemMonitor는 이제 hardware 디렉토리에서 통합 관리됩니다.
// 기존 코드와의 호환성을 위해 re-export 합니다.

import { SystemMonitor } from "./hardware/index.js";

// 기본 시스템 모니터 인스턴스 생성
const systemMonitor = new SystemMonitor();

// 기존 API와 호환되도록 함수들을 래핑
export class Monitor {
  // CPU 관련 메서드들
  async getCpuStatus() {
    return await systemMonitor.cpu.getCpuStatus();
  }

  async getDetailedCpuStatus() {
    return await systemMonitor.cpu.getDetailedCpuStatus();
  }

  // 메모리 관련 메서드들
  async getMemoryStatus() {
    return await systemMonitor.memory.getMemoryStatus();
  }

  async getDetailedMemoryStatus() {
    return await systemMonitor.memory.getDetailedMemoryStatus();
  }

  // GPU 관련 메서드들
  async getGpuStatus() {
    return await systemMonitor.gpu.getGpuStatus();
  }

  async getDetailedGpuStatus() {
    return await systemMonitor.gpu.getDetailedGpuStatus();
  }

  // 네트워크 관련 메서드들
  async getNetworkStatus() {
    return await systemMonitor.network.getNetworkStatus();
  }

  async getDetailedNetworkStatus() {
    return await systemMonitor.network.getDetailedNetworkStatus();
  }

  // 디스크 관련 메서드들
  async getDiskStatus() {
    return await systemMonitor.disk.getDiskStatus();
  }

  // 프로세스 관련 메서드들
  async getProcessList(sortBy: string = "cpu", limit: number = 10) {
    return await systemMonitor.process.getProcessList(sortBy, limit);
  }

  async getDetailedProcessStatus() {
    return await systemMonitor.process.getDetailedProcessStatus();
  }

  // 시스템 전체 상태 조회
  async getSystemOverview(includeAnalysis: boolean = true) {
    return await systemMonitor.getSystemOverview(includeAnalysis);
  }

  // 개별 하드웨어 모니터에 직접 접근
  get cpu() { return systemMonitor.cpu; }
  get memory() { return systemMonitor.memory; }
  get gpu() { return systemMonitor.gpu; }
  get network() { return systemMonitor.network; }
  get disk() { return systemMonitor.disk; }
  get process() { return systemMonitor.process; }
} 