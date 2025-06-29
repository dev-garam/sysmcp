import si from "systeminformation";
import { Logger } from "../logger.js";
import { exec } from "child_process";
import { promisify } from "util";
import { NetworkStatus, DetailedNetworkStatus } from "./types.js";

const execAsync = promisify(exec);

export class NetworkMonitor {
  async getNetworkStatus(): Promise<NetworkStatus> {
    try {
      const [interfaces, networkStats] = await Promise.all([
        si.networkInterfaces(),
        si.networkStats(),
      ]);

      return {
        interfaces: interfaces.map(iface => ({
          iface: iface.iface,
          ip4: iface.ip4 || "",
          ip6: iface.ip6 || "",
          mac: iface.mac || "",
          speed: iface.speed || 0,
          operstate: iface.operstate || "unknown",
        })),
        stats: networkStats.map(stat => ({
          iface: stat.iface,
          rx_bytes: stat.rx_bytes,
          tx_bytes: stat.tx_bytes,
          rx_sec: stat.rx_sec || 0,
          tx_sec: stat.tx_sec || 0,
        })),
      };
    } catch (error) {
      throw new Error(`네트워크 정보 조회 실패: ${error}`);
    }
  }

  async getDetailedNetworkStatus(): Promise<DetailedNetworkStatus> {
    const startTime = Date.now();
    Logger.info('네트워크 상세 상태 조회 시작');

    try {
      // 기본 네트워크 정보 먼저 가져오기
      const basicNetworkStatus = await this.getNetworkStatus();

      // 상세 네트워크 정보 수집 (병렬 실행)
      const [
        netstatOutput,
        nettopOutput,
        ifconfigOutput,
        wifiInfo,
        pingStats
      ] = await Promise.all([
        this.executeNetstat(),
        this.executeNettop(),
        this.executeIfconfig(),
        this.executeWifiInfo(),
        this.executePingTest()
      ]);

      // 데이터 파싱
      const connectionAnalysis = this.parseNetstat(netstatOutput);
      const realTimeStats = this.parseNettop(nettopOutput, basicNetworkStatus.stats);
      const interfaceDetails = this.parseIfconfig(ifconfigOutput);
      const wifiDetails = this.parseWifiInfo(wifiInfo);
      const qualityMetrics = this.parsePingStats(pingStats);

      const result: DetailedNetworkStatus = {
        ...basicNetworkStatus,
        realTimeStats,
        connectionAnalysis,
        wifiDetails,
        qualityMetrics,
        interfaceDetails
      };

      Logger.info('네트워크 상세 상태 조회 완료', {
        activeInterface: result.realTimeStats?.activeInterface,
        bandwidth: `${result.realTimeStats?.currentBandwidth.download}/${result.realTimeStats?.currentBandwidth.upload} Mbps`,
        connections: result.connectionAnalysis?.activeConnections,
        latency: result.qualityMetrics?.latency + 'ms'
      });
      Logger.trace('getDetailedNetworkStatus', startTime);

      return result;
    } catch (error) {
      Logger.error('네트워크 상세 정보 조회 실패', error);
      // 기본 네트워크 상태라도 반환
      const basicNetworkStatus = await this.getNetworkStatus().catch(() => ({
        interfaces: [],
        stats: []
      }));
      return basicNetworkStatus;
    }
  }

  private async executeNetstat(): Promise<string> {
    try {
      // 활성 연결 정보와 통계
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('netstat timeout')), 5000)
      );

      const commands = [
        'netstat -an | head -100',  // 활성 연결
        'netstat -s',               // 프로토콜 통계
        'netstat -rn'               // 라우팅 테이블
      ];

      const commandPromises = commands.map(cmd =>
        Promise.race([
          execAsync(cmd),
          timeoutPromise
        ]).catch(err => ({ stdout: '', stderr: err.message }))
      );

      const results = await Promise.all(commandPromises);
      return results.map(r => (r as any).stdout ? (r as any).stdout.trim() : '').join('|||');
    } catch (error) {
      Logger.error(`netstat 실행 실패: ${error}`);
      return '';
    }
  }

  private async executeNettop(): Promise<string> {
    try {
      // 실시간 네트워크 사용량 (1초간 모니터링)
      const { stdout } = await execAsync('nettop -l 1 -c | head -50');
      return stdout;
    } catch (error) {
      Logger.warn('nettop 실행 실패', error);
      return '';
    }
  }

  private async executeIfconfig(): Promise<string> {
    try {
      // 모든 인터페이스 상세 정보
      const { stdout } = await execAsync('ifconfig -a');
      return stdout;
    } catch (error) {
      Logger.warn('ifconfig 실행 실패', error);
      return '';
    }
  }

  private async executeWifiInfo(): Promise<string> {
    try {
      // WiFi 상세 정보 (macOS)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('wifi info timeout')), 3000)
      );

      const commands = [
        '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I',
        'networksetup -getairportnetwork en1 2>/dev/null || networksetup -getairportnetwork en0 2>/dev/null'
      ];

      const commandPromises = commands.map(cmd =>
        Promise.race([
          execAsync(cmd),
          timeoutPromise
        ]).catch(err => ({ stdout: '', stderr: err.message }))
      );

      const results = await Promise.all(commandPromises);
      return results.map(r => (r as any).stdout ? (r as any).stdout.trim() : '').join('|||');
    } catch (error) {
      Logger.warn('WiFi 정보 조회 실패', error);
      return '';
    }
  }

  private async executePingTest(): Promise<string> {
    try {
      // 네트워크 품질 측정 (Google DNS로 빠른 핑 테스트)
      const { stdout } = await execAsync('ping -c 3 -t 3 8.8.8.8 2>/dev/null || echo "ping failed"');
      return stdout;
    } catch (error) {
      Logger.warn('핑 테스트 실패', error);
      return 'ping failed';
    }
  }

  private parseNetstat(netstatOutput: string) {
    try {
      if (!netstatOutput) return this.getEmptyConnectionAnalysis();

      const sections = netstatOutput.split('|||');
      const [connections, stats, routing] = sections;

      const topConnections: Array<{
        pid: number;
        processName: string;
        localAddress: string;
        remoteAddress: string;
        bytesIn: number;
        bytesOut: number;
        state: string;
        protocol: string;
      }> = [];

      let activeConnections = 0;
      let establishedConnections = 0;
      let listeningPorts = 0;

      // 연결 정보 파싱
      if (connections) {
        const lines = connections.split('\n');
        for (const line of lines) {
          if (line.includes('tcp') || line.includes('udp')) {
            activeConnections++;

            if (line.includes('ESTABLISHED')) {
              establishedConnections++;
            }
            if (line.includes('LISTEN')) {
              listeningPorts++;
            }

            // 연결 정보 추출 (간소화된 파싱)
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 6) {
              const protocol = parts[0];
              const localAddr = parts[3] || '';
              const remoteAddr = parts[4] || '';
              const state = parts[5] || '';

              if (remoteAddr && !remoteAddr.includes('*') && topConnections.length < 10) {
                topConnections.push({
                  pid: 0, // netstat doesn't provide PID
                  processName: 'Unknown',
                  localAddress: localAddr,
                  remoteAddress: remoteAddr,
                  bytesIn: 0,
                  bytesOut: 0,
                  state,
                  protocol
                });
              }
            }
          }
        }
      }

      // 프로토콜 통계 파싱 (간소화)
      const protocolStats = {
        tcp: { connections: 0, bytesIn: 0, bytesOut: 0 },
        udp: { connections: 0, bytesIn: 0, bytesOut: 0 },
        other: { connections: 0, bytesIn: 0, bytesOut: 0 }
      };

      if (stats) {
        const tcpMatch = stats.match(/tcp.*?(\d+).*?packet/i);
        const udpMatch = stats.match(/udp.*?(\d+).*?packet/i);

        if (tcpMatch) protocolStats.tcp.connections = parseInt(tcpMatch[1]) || 0;
        if (udpMatch) protocolStats.udp.connections = parseInt(udpMatch[1]) || 0;
      }

      return {
        activeConnections,
        establishedConnections,
        listeningPorts,
        topConnections,
        protocolStats
      };
    } catch (error) {
      Logger.error('netstat 파싱 실패', error);
      return this.getEmptyConnectionAnalysis();
    }
  }

  private parseNettop(nettopOutput: string, basicStats: any[]) {
    try {
      const activeInterface = this.findActiveInterface(basicStats);

      // nettop 출력에서 실시간 대역폭 정보 추출
      let totalDownload = 0;
      let totalUpload = 0;

      if (nettopOutput) {
        const lines = nettopOutput.split('\n');
        for (const line of lines) {
          // bytes_in, bytes_out 패턴 찾기
          const inMatch = line.match(/(\d+(?:\.\d+)?)\s*[KMG]?iB/);
          const outMatch = line.match(/(\d+(?:\.\d+)?)\s*[KMG]?iB.*?(\d+(?:\.\d+)?)\s*[KMG]?iB/);

          if (inMatch && outMatch) {
            const bytesIn = this.parseByteValue(inMatch[0]);
            const bytesOut = this.parseByteValue(outMatch[2] || '0');

            totalDownload += bytesIn;
            totalUpload += bytesOut;
          }
        }
      }

      // Mbps로 변환 (대략적인 계산)
      const downloadMbps = Math.round((totalDownload * 8) / (1024 * 1024) * 100) / 100;
      const uploadMbps = Math.round((totalUpload * 8) / (1024 * 1024) * 100) / 100;
      const totalMbps = downloadMbps + uploadMbps;

      const currentTime = Date.now();

      return {
        activeInterface,
        currentBandwidth: {
          download: downloadMbps,
          upload: uploadMbps,
          total: totalMbps
        },
        history: [{
          timestamp: currentTime,
          downloadMbps,
          uploadMbps,
          totalMbps
        }],
        peaks: {
          maxDownload: downloadMbps,
          maxUpload: uploadMbps,
          avgDownload: downloadMbps,
          avgUpload: uploadMbps
        }
      };
    } catch (error) {
      Logger.error('nettop 파싱 실패', error);
      return this.getEmptyRealTimeStats();
    }
  }

  private parseIfconfig(ifconfigOutput: string) {
    const interfaceDetails: Array<{
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
    }> = [];

    try {
      if (!ifconfigOutput) return interfaceDetails;

      // 인터페이스별로 분할
      const interfaces = ifconfigOutput.split(/^([a-z0-9]+):/m);

      for (let i = 1; i < interfaces.length; i += 2) {
        const ifaceName = interfaces[i];
        const ifaceData = interfaces[i + 1] || '';

        if (!ifaceName || !ifaceData) continue;

        // MTU 추출
        const mtuMatch = ifaceData.match(/mtu (\d+)/);
        const mtu = mtuMatch ? parseInt(mtuMatch[1]) : 1500;

        // 패킷 통계 추출  
        const rxPacketsMatch = ifaceData.match(/RX packets:(\d+)/);
        const txPacketsMatch = ifaceData.match(/TX packets:(\d+)/);
        const rxErrorsMatch = ifaceData.match(/RX.*?errors:(\d+)/);
        const txErrorsMatch = ifaceData.match(/TX.*?errors:(\d+)/);

        // 타입 결정
        let type = 'unknown';
        if (ifaceName.startsWith('en')) type = 'ethernet';
        else if (ifaceName.startsWith('lo')) type = 'loopback';
        else if (ifaceName.startsWith('utun')) type = 'tunnel';
        else if (ifaceName.startsWith('awdl')) type = 'airdrop';

        interfaceDetails.push({
          iface: ifaceName,
          type,
          mtu,
          duplex: 'full', // 기본값
          carrier: ifaceData.includes('status: active'),
          packets: {
            rxPackets: rxPacketsMatch ? parseInt(rxPacketsMatch[1]) : 0,
            txPackets: txPacketsMatch ? parseInt(txPacketsMatch[1]) : 0,
            rxErrors: rxErrorsMatch ? parseInt(rxErrorsMatch[1]) : 0,
            txErrors: txErrorsMatch ? parseInt(txErrorsMatch[1]) : 0,
            rxDropped: 0, // macOS ifconfig doesn't show dropped packets
            txDropped: 0
          },
          throughput: {
            currentRx: 0,
            currentTx: 0,
            avgRx: 0,
            avgTx: 0
          }
        });
      }

      return interfaceDetails;
    } catch (error) {
      Logger.error('ifconfig 파싱 실패', error);
      return interfaceDetails;
    }
  }

  private parseWifiInfo(wifiOutput: string) {
    try {
      if (!wifiOutput) return undefined;

      const sections = wifiOutput.split('|||');
      const [airportInfo, networkInfo] = sections;

      if (!airportInfo) return undefined;

      // airport -I 출력 파싱
      const lines = airportInfo.split('\n');
      const info: any = {};

      for (const line of lines) {
        const [key, ...valueParts] = line.trim().split(':');
        if (key && valueParts.length > 0) {
          const value = valueParts.join(':').trim();
          info[key.trim()] = value;
        }
      }

      return {
        ssid: info.SSID || 'Unknown',
        signalStrength: parseInt(info.RSSI) || 0,
        signalQuality: this.calculateSignalQuality(parseInt(info.RSSI) || 0),
        channel: parseInt(info.channel) || 0,
        frequency: this.channelToFrequency(parseInt(info.channel) || 0),
        linkSpeed: parseInt(info.maxRate) || 0,
        security: info.security_cc || 'Unknown',
        transmitRate: parseInt(info.lastTxRate) || 0,
        receiveRate: parseInt(info.maxRate) || 0
      };
    } catch (error) {
      Logger.warn('WiFi 정보 파싱 실패', error);
      return undefined;
    }
  }

  private parsePingStats(pingOutput: string) {
    try {
      if (!pingOutput || pingOutput.includes('ping failed')) {
        return {
          latency: 0,
          jitter: 0,
          packetLoss: 100,
          bandwidth: 0,
          dnsResolutionTime: 0
        };
      }

      // ping 결과에서 통계 추출
      const lines = pingOutput.split('\n');
      let latency = 0;
      let packetLoss = 0;
      let jitter = 0;

      for (const line of lines) {
        // 패킷 손실률 파싱
        const lossMatch = line.match(/(\d+)% packet loss/);
        if (lossMatch) {
          packetLoss = parseInt(lossMatch[1]);
        }

        // 지연시간 통계 파싱
        const timeMatch = line.match(/min\/avg\/max\/stddev = ([\d.]+)\/([\d.]+)\/([\d.]+)\/([\d.]+)/);
        if (timeMatch) {
          latency = parseFloat(timeMatch[2]); // 평균값
          jitter = parseFloat(timeMatch[4]);  // 표준편차를 지터로 사용
        }
      }

      return {
        latency: Math.round(latency * 100) / 100,
        jitter: Math.round(jitter * 100) / 100,
        packetLoss,
        bandwidth: 0, // 별도 측정 필요
        dnsResolutionTime: 0 // 별도 측정 필요
      };
    } catch (error) {
      Logger.error('핑 통계 파싱 실패', error);
      return {
        latency: 0,
        jitter: 0,
        packetLoss: 100,
        bandwidth: 0,
        dnsResolutionTime: 0
      };
    }
  }

  // 유틸리티 메서드들
  private findActiveInterface(stats: any[]): string {
    if (!stats || stats.length === 0) return 'unknown';

    // 가장 많은 트래픽이 있는 인터페이스 찾기
    let maxTraffic = 0;
    let activeInterface = 'unknown';

    for (const stat of stats) {
      const traffic = (stat.rx_bytes || 0) + (stat.tx_bytes || 0);
      if (traffic > maxTraffic) {
        maxTraffic = traffic;
        activeInterface = stat.iface;
      }
    }

    return activeInterface;
  }

  private parseByteValue(value: string): number {
    const match = value.match(/([\d.]+)\s*([KMGT]?)iB/);
    if (!match) return 0;

    const num = parseFloat(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'K': return num * 1024;
      case 'M': return num * 1024 * 1024;
      case 'G': return num * 1024 * 1024 * 1024;
      case 'T': return num * 1024 * 1024 * 1024 * 1024;
      default: return num;
    }
  }

  private calculateSignalQuality(rssi: number): number {
    if (rssi >= -50) return 100;
    if (rssi >= -60) return 80;
    if (rssi >= -70) return 60;
    if (rssi >= -80) return 40;
    if (rssi >= -90) return 20;
    return 0;
  }

  private channelToFrequency(channel: number): number {
    if (channel >= 1 && channel <= 14) {
      return 2412 + (channel - 1) * 5; // 2.4GHz
    } else if (channel >= 36) {
      return 5180 + (channel - 36) * 5; // 5GHz (간소화)
    }
    return 0;
  }

  private getEmptyConnectionAnalysis() {
    return {
      activeConnections: 0,
      establishedConnections: 0,
      listeningPorts: 0,
      topConnections: [],
      protocolStats: {
        tcp: { connections: 0, bytesIn: 0, bytesOut: 0 },
        udp: { connections: 0, bytesIn: 0, bytesOut: 0 },
        other: { connections: 0, bytesIn: 0, bytesOut: 0 }
      }
    };
  }

  private getEmptyRealTimeStats() {
    return {
      activeInterface: 'unknown',
      currentBandwidth: {
        download: 0,
        upload: 0,
        total: 0
      },
      history: [],
      peaks: {
        maxDownload: 0,
        maxUpload: 0,
        avgDownload: 0,
        avgUpload: 0
      }
    };
  }
} 