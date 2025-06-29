// 공통 타입 정의
export interface CpuStatus {
  usage: number;
  cores: number;
  speed: number;
  temperature?: number;
  loadAverage: number[];
  model: string;
}

export interface DetailedCpuStatus extends CpuStatus {
  // macOS 전용 상세 정보
  performanceCores?: number;     // Performance 코어 수
  efficiencyCores?: number;      // Efficiency 코어 수
  physicalCores?: number;        // 물리 코어 수
  logicalCores?: number;         // 논리 코어 수

  // 온도 정보
  temperatures?: {
    cpu: number;                 // CPU 평균 온도
    cores: number[];            // 코어별 온도
    max: number;                // 최고 온도
    sensors: { [key: string]: number }; // 센서별 온도
  };

  // 파워 정보 (Apple Silicon)
  power?: {
    packagePower?: number;       // 전체 패키지 전력 (W)
    cpuPower?: number;          // CPU 전력 (W)
    gpuPower?: number;          // GPU 전력 (W)
    anePower?: number;          // ANE(Neural Engine) 전력 (W)
  };

  // 주파수 상세 정보
  frequencies?: {
    base: number;               // 기본 주파수 (GHz)
    boost: number;              // 부스트 주파수 (GHz)
    current: number[];          // 코어별 현재 주파수 (GHz)
    avg: number;                // 평균 주파수 (GHz)
  };

  // 코어별 사용률
  coreUsage?: number[];         // 코어별 사용률 (%)

  // 스케줄러 정보
  scheduler?: {
    runQueue: number;           // 실행 대기열 크기
    contextSwitches: number;    // 컨텍스트 스위치 수
    interrupts: number;         // 인터럽트 수
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
  // macOS 전용 상세 정보
  appMemory?: number;        // 앱이 사용하는 메모리 (GB)
  wiredMemory?: number;      // 시스템 필수 메모리 (GB)
  compressedMemory?: number; // 압축된 메모리 (GB)
  cachedFiles?: number;      // 캐시된 파일 (GB)
  memoryPressure?: string;   // 메모리 압박 상태 (Normal/Warning/Critical)

  // 상세 분석
  details?: {
    pageSize: number;        // 페이지 크기 (bytes)
    pagesActive: number;     // 활성 페이지
    pagesInactive: number;   // 비활성 페이지
    pagesWired: number;      // 고정 페이지
    pagesCompressed: number; // 압축된 페이지
    pagesFree: number;       // 여유 페이지
    swapIns: number;         // 스왑 인
    swapOuts: number;        // 스왑 아웃
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
  // Apple Silicon GPU 상세 정보
  details?: {
    chipset: string;              // GPU 칩셋 (e.g., Apple M4)
    totalCores: number;           // 총 GPU 코어 수
    metalSupport: string;         // Metal 지원 버전

    // 성능 정보
    utilization: {
      overall: number;            // 전체 GPU 사용률 (%)
      perCore?: number[];         // 코어별 사용률 (%)
      performanceState: number;   // 현재 성능 상태 (0-15)
      frequencyMHz?: number;      // 현재 클럭 주파수 (MHz)
    };

    // 메모리 상세 정보
    memory: {
      totalMB: number;            // 총 VRAM (MB)
      usedMB: number;             // 사용된 VRAM (MB)
      freeMB: number;             // 여유 VRAM (MB)
      cachedMB?: number;          // 캐시된 VRAM (MB)
      utilizationPercent: number; // 실제 메모리 사용률 (%)
      totalUtilizationPercent?: number; // 캐시 포함 총 사용률 (%)
      bandwidth?: number;         // 메모리 대역폭 (GB/s)
    };

    // 온도 및 전력
    thermal: {
      temperature: number;        // GPU 온도 (°C)
      thermalState?: string;      // 열 상태 (Normal/Warm/Hot)
      fanSpeed?: number;          // 팬 속도 (%)
    };

    power: {
      usage: number;              // 현재 전력 사용량 (W)
      maxPower?: number;          // 최대 전력 (W)
      efficiency?: number;        // 성능/전력 비율
    };

    // 활성 프로세스
    activeProcesses?: Array<{
      pid: number;
      name: string;
      commandQueueCount: number;
      accumulatedGpuTime: number; // GPU 사용 시간 (ns)
      api: string;                // 사용 API (Metal, OpenGL 등)
    }>;

    // 스로틀링 정보
    throttling?: {
      isThrottling: boolean;
      reason?: string;
      throttlePercent?: number;
    };

    // 성능 히스토리
    performanceHistory?: {
      avgUtilization: number;     // 평균 사용률
      peakUtilization: number;    // 최고 사용률
      thermalEvents: number;      // 열 이벤트 수
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
  // 실시간 대역폭 모니터링
  realTimeStats?: {
    activeInterface: string;       // 주요 활성 인터페이스
    currentBandwidth: {
      download: number;            // 현재 다운로드 속도 (Mbps)
      upload: number;              // 현재 업로드 속도 (Mbps)
      total: number;               // 총 대역폭 사용량 (Mbps)
    };

    // 대역폭 히스토리 (최근 10초간)
    history: Array<{
      timestamp: number;
      downloadMbps: number;
      uploadMbps: number;
      totalMbps: number;
    }>;

    // 피크 성능
    peaks: {
      maxDownload: number;         // 최고 다운로드 속도 (Mbps)
      maxUpload: number;           // 최고 업로드 속도 (Mbps)
      avgDownload: number;         // 평균 다운로드 속도 (Mbps)
      avgUpload: number;           // 평균 업로드 속도 (Mbps)
    };
  };

  // 연결 상태 분석
  connectionAnalysis?: {
    activeConnections: number;     // 활성 연결 수
    establishedConnections: number; // 설정된 연결 수
    listeningPorts: number;        // 리스닝 포트 수

    // 연결별 대역폭 사용량 상위 10개
    topConnections: Array<{
      pid: number;
      processName: string;
      localAddress: string;
      remoteAddress: string;
      bytesIn: number;             // 수신 바이트
      bytesOut: number;            // 송신 바이트
      state: string;               // 연결 상태
      protocol: string;            // 프로토콜 (TCP/UDP)
    }>;

    // 프로토콜별 통계
    protocolStats: {
      tcp: { connections: number; bytesIn: number; bytesOut: number; };
      udp: { connections: number; bytesIn: number; bytesOut: number; };
      other: { connections: number; bytesIn: number; bytesOut: number; };
    };
  };

  // WiFi 상세 정보 (WiFi 연결시)
  wifiDetails?: {
    ssid: string;                  // WiFi 네트워크 이름
    signalStrength: number;        // 신호 강도 (dBm)
    signalQuality: number;         // 신호 품질 (%)
    channel: number;               // 채널
    frequency: number;             // 주파수 (MHz)
    linkSpeed: number;             // 링크 속도 (Mbps)
    security: string;              // 보안 방식
    transmitRate: number;          // 전송률 (Mbps)
    receiveRate: number;           // 수신률 (Mbps)
  };

  // 네트워크 품질 측정
  qualityMetrics?: {
    latency: number;               // 평균 지연시간 (ms)
    jitter: number;                // 지터 (ms)
    packetLoss: number;            // 패킷 손실률 (%)
    bandwidth: number;             // 측정된 대역폭 (Mbps)
    dnsResolutionTime: number;     // DNS 해석 시간 (ms)
  };

  // 인터페이스별 상세 통계
  interfaceDetails?: Array<{
    iface: string;
    type: string;                  // 인터페이스 타입 (ethernet, wifi, loopback 등)
    mtu: number;                   // MTU 크기
    duplex: string;                // 듀플렉스 모드
    carrier: boolean;              // 캐리어 상태

    // 상세 통계
    packets: {
      rxPackets: number;           // 수신 패킷
      txPackets: number;           // 송신 패킷
      rxErrors: number;            // 수신 에러
      txErrors: number;            // 송신 에러
      rxDropped: number;           // 수신 드롭
      txDropped: number;           // 송신 드롭
    };

    // 실시간 처리량
    throughput: {
      currentRx: number;           // 현재 수신 처리량 (bytes/s)
      currentTx: number;           // 현재 송신 처리량 (bytes/s)
      avgRx: number;               // 평균 수신 처리량 (bytes/s)
      avgTx: number;               // 평균 송신 처리량 (bytes/s)
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
  // 기본 프로세스 정보
  summary: {
    totalProcesses: number;          // 전체 프로세스 수
    runningProcesses: number;        // 실행 중인 프로세스 수
    sleepingProcesses: number;       // 대기 중인 프로세스 수
    zombieProcesses: number;         // 좀비 프로세스 수
    totalThreads: number;            // 전체 스레드 수
  };

  // 리소스 사용량 상위 프로세스들
  topProcesses: {
    byCpu: Array<{
      pid: number;
      ppid: number;                  // 부모 프로세스 ID
      name: string;
      command: string;               // 전체 명령어
      user: string;                  // 실행 사용자
      cpu: number;                   // CPU 사용률 (%)
      memory: number;                // 메모리 사용량 (MB)
      memoryPercent: number;         // 메모리 사용률 (%)

      // 상세 메모리 정보
      memoryDetails: {
        rss: number;                 // 실제 메모리 사용량 (KB)
        vsz: number;                 // 가상 메모리 크기 (KB)
        shared: number;              // 공유 메모리 (KB)
        private: number;             // 전용 메모리 (KB)
      };

      // 시간 정보
      timeInfo: {
        cpuTime: string;             // 누적 CPU 시간
        startTime: number;           // 시작 시간
        runTime: number;             // 실행 시간 (초)
      };

      // 스레드 및 파일 정보
      resources: {
        threads: number;             // 스레드 수
        fileDescriptors: number;     // 파일 디스크립터 수
        openFiles: number;          // 열린 파일 수
        ports: number;              // 포트 수 (macOS)
      };

      // 상태 정보
      status: {
        state: string;               // 프로세스 상태
        priority: number;            // 우선순위
        nice: number;                // Nice 값
        contextSwitches: number;     // 컨텍스트 스위치 수
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

  // 프로세스 트리 분석
  processTree?: {
    // 가장 많은 자식 프로세스를 가진 부모들
    topParents: Array<{
      pid: number;
      name: string;
      childCount: number;
      totalCpuUsage: number;         // 자식들 포함 총 CPU 사용률
      totalMemoryUsage: number;      // 자식들 포함 총 메모리 사용량
      children: Array<{
        pid: number;
        name: string;
        cpu: number;
        memory: number;
      }>;
    }>;
  };

  // 시스템 서비스 분석
  systemServices?: {
    // 중요 시스템 서비스들의 상태
    criticalServices: Array<{
      name: string;
      pid: number;
      status: 'running' | 'stopped' | 'error';
      cpu: number;
      memory: number;
      restarts: number;             // 재시작 횟수 (추정)
    }>;

    // 리소스를 많이 사용하는 서비스들
    heavyServices: Array<{
      name: string;
      pid: number;
      cpu: number;
      memory: number;
      impact: 'high' | 'medium' | 'low';
    }>;
  };

  // 보안 및 권한 분석
  securityAnalysis?: {
    // root 권한으로 실행되는 프로세스들
    rootProcesses: Array<{
      pid: number;
      name: string;
      command: string;
      cpu: number;
      memory: number;
    }>;

    // 의심스러운 프로세스들 (높은 리소스 사용 + 알 수 없는 프로세스)
    suspiciousProcesses: Array<{
      pid: number;
      name: string;
      reason: string;               // 의심 이유
      cpu: number;
      memory: number;
      fileDescriptors: number;
    }>;
  };

  // 성능 영향 분석
  performanceImpact?: {
    // CPU 병목을 일으키는 프로세스들
    cpuBottlenecks: Array<{
      pid: number;
      name: string;
      cpu: number;
      impact: number;               // 성능 영향도 (0-100)
      recommendation: string;
    }>;

    // 메모리 병목을 일으키는 프로세스들
    memoryBottlenecks: Array<{
      pid: number;
      name: string;
      memory: number;
      memoryPercent: number;
      impact: number;
      recommendation: string;
    }>;

    // I/O 집약적인 프로세스들
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