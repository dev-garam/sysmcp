import si from "systeminformation";
import { DiskStatus } from "./types.js";

export class DiskMonitor {
  async getDiskStatus(): Promise<DiskStatus> {
    try {
      const [fsSize, disksIO] = await Promise.all([
        si.fsSize(),
        si.disksIO(),
      ]);

      return {
        disks: fsSize.map(disk => ({
          device: disk.fs,
          type: disk.type,
          size: Math.round(disk.size / (1024 * 1024 * 1024) * 100) / 100, // GB
          used: Math.round(disk.used / (1024 * 1024 * 1024) * 100) / 100,
          available: Math.round(disk.available / (1024 * 1024 * 1024) * 100) / 100,
          usagePercent: Math.round(disk.use * 100) / 100,
          mount: disk.mount,
        })),
        io: {
          reads: disksIO.rIO || 0,
          writes: disksIO.wIO || 0,
          readBytes: disksIO.rIO_sec || 0,
          writeBytes: disksIO.wIO_sec || 0,
        },
      };
    } catch (error) {
      throw new Error(`디스크 정보 조회 실패: ${error}`);
    }
  }
} 