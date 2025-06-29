import si from "systeminformation";
import { Logger } from "../logger.js";
import { exec } from "child_process";
import { promisify } from "util";
import { MemoryStatus, DetailedMemoryStatus } from "./types.js";

const execAsync = promisify(exec);

export class MemoryMonitor {
  async getMemoryStatus(): Promise<MemoryStatus> {
    const startTime = Date.now();
    Logger.info('메모리 상태 조회 시작');

    try {
      const mem = await si.mem();

      // macOS에서는 더 정확한 메모리 계산을 위해 vm_stat 사용
      if (process.platform === 'darwin') {
        try {
          const vmStatResult = await this.executeVmStat();
          const vmData = this.parseVmStatForBasicMemory(vmStatResult);

          const result = {
            total: Math.round(mem.total / (1024 * 1024 * 1024) * 100) / 100, // GB
            used: vmData.actualUsed, // vm_stat에서 계산한 실제 사용량
            free: vmData.actualFree, // vm_stat에서 계산한 실제 여유량
            usagePercent: Math.round((vmData.actualUsed / (mem.total / (1024 * 1024 * 1024))) * 100 * 100) / 100,
            available: Math.round(mem.available / (1024 * 1024 * 1024) * 100) / 100,
            swapTotal: Math.round(mem.swaptotal / (1024 * 1024 * 1024) * 100) / 100,
            swapUsed: Math.round(mem.swapused / (1024 * 1024 * 1024) * 100) / 100,
          };

          if (result.usagePercent > 80) {
            Logger.warn('메모리 사용률이 높습니다', { usagePercent: result.usagePercent + '%' });
          }

          Logger.info('메모리 상태 조회 완료 (macOS 최적화)', {
            total: result.total + 'GB',
            used: result.used + 'GB',
            usagePercent: result.usagePercent + '%',
            note: '캐시와 비활성 메모리 제외'
          });
          Logger.trace('getMemoryStatus', startTime);

          return result;
        } catch (vmError) {
          Logger.warn('vm_stat 실행 실패, 기본 메모리 정보 사용', vmError);
          // vm_stat 실패시 기본 메모리 정보 사용
        }
      }

      // 기본 메모리 정보 (macOS가 아니거나 vm_stat 실패시)
      const result = {
        total: Math.round(mem.total / (1024 * 1024 * 1024) * 100) / 100, // GB
        used: Math.round(mem.used / (1024 * 1024 * 1024) * 100) / 100,
        free: Math.round(mem.free / (1024 * 1024 * 1024) * 100) / 100,
        usagePercent: Math.round((mem.used / mem.total) * 100 * 100) / 100,
        available: Math.round(mem.available / (1024 * 1024 * 1024) * 100) / 100,
        swapTotal: Math.round(mem.swaptotal / (1024 * 1024 * 1024) * 100) / 100,
        swapUsed: Math.round(mem.swapused / (1024 * 1024 * 1024) * 100) / 100,
      };

      if (result.usagePercent > 80) {
        Logger.warn('메모리 사용률이 높습니다', { usagePercent: result.usagePercent + '%' });
      }

      Logger.info('메모리 상태 조회 완료', {
        total: result.total + 'GB',
        used: result.used + 'GB',
        usagePercent: result.usagePercent + '%'
      });
      Logger.trace('getMemoryStatus', startTime);

      return result;
    } catch (error) {
      Logger.error('메모리 정보 조회 실패', error);
      throw new Error(`메모리 정보 조회 실패: ${error}`);
    }
  }

  async getDetailedMemoryStatus(): Promise<DetailedMemoryStatus> {
    const startTime = Date.now();
    Logger.info('상세 메모리 상태 조회 시작');

    try {
      // 기본 메모리 정보 가져오기
      const basicMemory = await this.getMemoryStatus();

      if (process.platform === 'darwin') {
        Logger.info('macOS 상세 메모리 정보 조회 중...');

        const [vmStatResult, memoryPressureResult] = await Promise.all([
          this.executeVmStat(),
          this.executeMemoryPressure()
        ]);

        const detailedInfo = this.parseVmStat(vmStatResult);
        const pressureInfo = this.parseMemoryPressure(memoryPressureResult);

        const result: DetailedMemoryStatus = {
          ...basicMemory,
          appMemory: detailedInfo.appMemory,
          wiredMemory: detailedInfo.wiredMemory,
          compressedMemory: detailedInfo.compressedMemory,
          cachedFiles: detailedInfo.cachedFiles,
          memoryPressure: pressureInfo.status,
          details: detailedInfo.details
        };

        Logger.info('상세 메모리 상태 조회 완료', {
          appMemory: result.appMemory + 'GB',
          wiredMemory: result.wiredMemory + 'GB',
          compressedMemory: result.compressedMemory + 'GB',
          memoryPressure: result.memoryPressure
        });
        Logger.trace('getDetailedMemoryStatus', startTime);

        return result;
      } else {
        Logger.info('macOS가 아닌 플랫폼에서는 기본 메모리 정보만 제공됩니다');
        return basicMemory;
      }
    } catch (error) {
      Logger.error('상세 메모리 정보 조회 실패', error);
      // 오류 발생시 기본 메모리 정보라도 반환
      return await this.getMemoryStatus();
    }
  }

  private async executeVmStat(): Promise<string> {
    try {
      const { stdout } = await execAsync('vm_stat');
      return stdout;
    } catch (error) {
      Logger.error('vm_stat 실행 실패', error);
      throw new Error('vm_stat 명령어 실행 실패');
    }
  }

  private async executeMemoryPressure(): Promise<string> {
    try {
      const { stdout } = await execAsync('memory_pressure -l 1');
      return stdout;
    } catch (error) {
      Logger.warn('memory_pressure 실행 실패, 기본값 사용', error);
      return 'Status: Normal';
    }
  }

  private parseVmStat(vmStatOutput: string) {
    const lines = vmStatOutput.split('\n');
    const pageSize = 4096; // macOS 기본 페이지 크기 (4KB)

    // vm_stat 출력에서 값 추출하는 헬퍼 함수
    const extractValue = (pattern: string): number => {
      const line = lines.find(l => l.includes(pattern));
      if (!line) return 0;
      const match = line.match(/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    };

    const pagesWired = extractValue('Pages wired down');
    const pagesActive = extractValue('Pages active');
    const pagesInactive = extractValue('Pages inactive');
    const pagesCompressed = extractValue('Pages stored in compressor');
    const pagesFree = extractValue('Pages free');
    const swapIns = extractValue('Pageins');
    const swapOuts = extractValue('Pageouts');

    // GB 단위로 변환
    const bytesToGB = (bytes: number): number =>
      Math.round(bytes / (1024 * 1024 * 1024) * 100) / 100;

    const wiredMemory = bytesToGB(pagesWired * pageSize);
    const activeMemory = bytesToGB(pagesActive * pageSize);
    const inactiveMemory = bytesToGB(pagesInactive * pageSize);
    const compressedMemory = bytesToGB(pagesCompressed * pageSize);
    const freeMemory = bytesToGB(pagesFree * pageSize);

    // App Memory는 Active + Inactive 메모리로 추정
    const appMemory = bytesToGB((pagesActive + pagesInactive) * pageSize);

    // Cached Files는 시스템이 사용하는 캐시 메모리로 추정
    const cachedFiles = Math.max(0, freeMemory - 1); // 여유 메모리에서 최소 1GB 제외

    return {
      appMemory,
      wiredMemory,
      compressedMemory,
      cachedFiles,
      details: {
        pageSize,
        pagesActive,
        pagesInactive,
        pagesWired,
        pagesCompressed,
        pagesFree,
        swapIns,
        swapOuts
      }
    };
  }

  private parseVmStatForBasicMemory(vmStatOutput: string) {
    const lines = vmStatOutput.split('\n');

    // 페이지 크기 추출 (최신 macOS는 16KB, 이전 버전은 4KB)
    const pageSizeLine = lines.find(l => l.includes('page size of'));
    const pageSizeMatch = pageSizeLine?.match(/(\d+) bytes/);
    const pageSize = pageSizeMatch ? parseInt(pageSizeMatch[1]) : 16384; // 기본값 16KB

    // vm_stat 출력에서 값 추출하는 헬퍼 함수
    const extractValue = (pattern: string): number => {
      const line = lines.find(l => l.includes(pattern));
      if (!line) return 0;
      const match = line.match(/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    };

    const pagesWired = extractValue('Pages wired down');
    const pagesActive = extractValue('Pages active');
    const pagesInactive = extractValue('Pages inactive');
    const pagesCompressed = extractValue('Pages stored in compressor');
    const pagesFree = extractValue('Pages free');

    // GB 단위로 변환
    const bytesToGB = (bytes: number): number =>
      Math.round(bytes / (1024 * 1024 * 1024) * 100) / 100;

    // 실제 사용 메모리 = Active + Wired (+ Compressed의 일부)
    // Inactive는 캐시나 해제 가능한 메모리이므로 제외
    const actualUsedBytes = (pagesActive + pagesWired + (pagesCompressed * 0.5)) * pageSize;
    const actualUsed = bytesToGB(actualUsedBytes);

    // 실제 여유 메모리 = Free + Inactive (+ Compressed의 일부)
    const actualFreeBytes = (pagesFree + pagesInactive + (pagesCompressed * 0.5)) * pageSize;
    const actualFree = bytesToGB(actualFreeBytes);

    Logger.info('메모리 계산 상세', {
      pageSize: pageSize + ' bytes',
      activePages: pagesActive,
      wiredPages: pagesWired,
      inactivePages: pagesInactive + ' (캐시/해제가능)',
      compressedPages: pagesCompressed,
      freePages: pagesFree,
      actualUsed: actualUsed + 'GB',
      actualFree: actualFree + 'GB'
    });

    return {
      actualUsed,
      actualFree,
      pageSize,
      breakdown: {
        active: bytesToGB(pagesActive * pageSize),
        wired: bytesToGB(pagesWired * pageSize),
        inactive: bytesToGB(pagesInactive * pageSize),
        compressed: bytesToGB(pagesCompressed * pageSize),
        free: bytesToGB(pagesFree * pageSize)
      }
    };
  }

  private parseMemoryPressure(memoryPressureOutput: string) {
    const output = memoryPressureOutput.toLowerCase();

    let status = 'Normal';
    if (output.includes('warn')) {
      status = 'Warning';
    } else if (output.includes('critical') || output.includes('urgent')) {
      status = 'Critical';
    }

    return { status };
  }
} 