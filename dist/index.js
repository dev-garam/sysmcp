#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { Logger } from "./logger.js";
import { Monitor } from "./monitor.js";
const server = new Server({
    name: "sysmcp-server",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
const monitor = new Monitor();
async function main() {
    Logger.info('SysMCP Server 초기화 중...');
    try {
        // 기존 stdio 모드로 단순하게 실행
        setupServerHandlers(server);
        const transport = new StdioServerTransport();
        await server.connect(transport);
        Logger.info('SysMCP Server가 성공적으로 시작되었습니다');
        console.error("SysMCP Server가 시작되었습니다.");
    }
    catch (error) {
        Logger.error('SysMCP Server 시작 실패', error);
        throw error;
    }
}
function setupServerHandlers(serverInstance) {
    // 도구 목록 정의
    serverInstance.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
            tools: [
                {
                    name: "get_cpu_status",
                    description: "CPU 사용률, 코어 정보, 주파수 등 CPU 상태를 조회합니다",
                    inputSchema: {
                        type: "object",
                        properties: {},
                    },
                },
                {
                    name: "get_memory_status",
                    description: "메모리 사용량, 가용 메모리, 스왑 정보 등을 조회합니다",
                    inputSchema: {
                        type: "object",
                        properties: {},
                    },
                },
                {
                    name: "get_gpu_status",
                    description: "GPU 사용률, 메모리, 온도 등 GPU 상태를 조회합니다",
                    inputSchema: {
                        type: "object",
                        properties: {},
                    },
                },
                {
                    name: "get_network_status",
                    description: "네트워크 인터페이스, 대역폭 사용량, 연결 상태를 조회합니다",
                    inputSchema: {
                        type: "object",
                        properties: {},
                    },
                },
                {
                    name: "get_disk_status",
                    description: "디스크 사용량, I/O 통계, 마운트 포인트 정보를 조회합니다",
                    inputSchema: {
                        type: "object",
                        properties: {},
                    },
                },
                {
                    name: "get_system_overview",
                    description: "전체 시스템 상태를 종합적으로 조회하고 성능 병목 지점을 분석합니다",
                    inputSchema: {
                        type: "object",
                        properties: {
                            include_analysis: {
                                type: "boolean",
                                description: "성능 분석 및 최적화 제안 포함 여부",
                                default: true,
                            },
                        },
                    },
                },
                {
                    name: "get_process_list",
                    description: "실행 중인 프로세스 목록과 리소스 사용량을 조회합니다",
                    inputSchema: {
                        type: "object",
                        properties: {
                            sort_by: {
                                type: "string",
                                enum: ["cpu", "memory", "name"],
                                description: "정렬 기준",
                                default: "cpu",
                            },
                            limit: {
                                type: "number",
                                description: "표시할 프로세스 수",
                                default: 10,
                            },
                        },
                    },
                },
                {
                    name: "get_detailed_memory_status",
                    description: "macOS 전용 상세 메모리 분석 (App Memory, Wired, Compressed, Cached Files, Memory Pressure)",
                    inputSchema: {
                        type: "object",
                        properties: {},
                    },
                },
                {
                    name: "get_detailed_cpu_status",
                    description: "macOS 전용 상세 CPU 분석 (Performance/Efficiency 코어, 온도, 파워 사용량, 주파수)",
                    inputSchema: {
                        type: "object",
                        properties: {},
                    },
                },
                {
                    name: "get_detailed_gpu_status",
                    description: "Apple Silicon GPU 상세 분석 (활용률, VRAM 사용량, 온도, 전력, 활성 프로세스, 스로틀링)",
                    inputSchema: {
                        type: "object",
                        properties: {},
                    },
                },
                {
                    name: "get_detailed_network_status",
                    description: "실시간 네트워크 대역폭 모니터링 (연결 분석, WiFi 상세 정보, 품질 측정, 인터페이스별 통계)",
                    inputSchema: {
                        type: "object",
                        properties: {},
                    },
                },
                {
                    name: "get_detailed_process_status",
                    description: "프로세스별 상세 리소스 분석 (CPU/메모리 사용량, 파일 디스크립터, 시스템 서비스, 보안 분석, 성능 영향 평가)",
                    inputSchema: {
                        type: "object",
                        properties: {},
                    },
                },
            ],
        };
    });
    // 도구 실행 핸들러
    serverInstance.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        Logger.info(`MCP 도구 호출: ${name}`, args);
        try {
            switch (name) {
                case "get_cpu_status":
                    const cpuStatus = await monitor.getCpuStatus();
                    Logger.info('CPU 상태 요청 완료');
                    return {
                        content: [
                            {
                                type: "text",
                                text: `## CPU 상태\n\n${JSON.stringify(cpuStatus, null, 2)}`,
                            },
                        ],
                    };
                case "get_memory_status":
                    const memoryStatus = await monitor.getMemoryStatus();
                    return {
                        content: [
                            {
                                type: "text",
                                text: `## 메모리 상태\n\n${JSON.stringify(memoryStatus, null, 2)}`,
                            },
                        ],
                    };
                case "get_gpu_status":
                    const gpuStatus = await monitor.getGpuStatus();
                    return {
                        content: [
                            {
                                type: "text",
                                text: `## GPU 상태\n\n${JSON.stringify(gpuStatus, null, 2)}`,
                            },
                        ],
                    };
                case "get_network_status":
                    const networkStatus = await monitor.getNetworkStatus();
                    return {
                        content: [
                            {
                                type: "text",
                                text: `## 네트워크 상태\n\n${JSON.stringify(networkStatus, null, 2)}`,
                            },
                        ],
                    };
                case "get_disk_status":
                    const diskStatus = await monitor.getDiskStatus();
                    return {
                        content: [
                            {
                                type: "text",
                                text: `## 디스크 상태\n\n${JSON.stringify(diskStatus, null, 2)}`,
                            },
                        ],
                    };
                case "get_system_overview":
                    const includeAnalysis = args?.include_analysis ?? true;
                    Logger.info('시스템 종합 상태 분석 시작', { includeAnalysis });
                    const overview = await monitor.getSystemOverview(includeAnalysis);
                    Logger.info('시스템 종합 상태 분석 완료', {
                        bottlenecks: overview.analysis?.bottlenecks?.length || 0,
                        score: overview.analysis?.score
                    });
                    return {
                        content: [
                            {
                                type: "text",
                                text: `## 시스템 종합 상태\n\n${JSON.stringify(overview, null, 2)}`,
                            },
                        ],
                    };
                case "get_process_list":
                    const sortBy = args?.sort_by ?? "cpu";
                    const limit = args?.limit ?? 10;
                    const processes = await monitor.getProcessList(sortBy, limit);
                    return {
                        content: [
                            {
                                type: "text",
                                text: `## 프로세스 목록 (상위 ${limit}개, ${sortBy} 기준)\n\n${JSON.stringify(processes, null, 2)}`,
                            },
                        ],
                    };
                case "get_detailed_memory_status":
                    const detailedMemoryStatus = await monitor.getDetailedMemoryStatus();
                    return {
                        content: [
                            {
                                type: "text",
                                text: `## 상세 메모리 상태\n\n${JSON.stringify(detailedMemoryStatus, null, 2)}`,
                            },
                        ],
                    };
                case "get_detailed_cpu_status":
                    const detailedCpuStatus = await monitor.getDetailedCpuStatus();
                    return {
                        content: [
                            {
                                type: "text",
                                text: `## 상세 CPU 상태\n\n${JSON.stringify(detailedCpuStatus, null, 2)}`,
                            },
                        ],
                    };
                case "get_detailed_gpu_status":
                    const detailedGpuStatus = await monitor.getDetailedGpuStatus();
                    return {
                        content: [
                            {
                                type: "text",
                                text: `## 상세 GPU 상태\n\n${JSON.stringify(detailedGpuStatus, null, 2)}`,
                            },
                        ],
                    };
                case "get_detailed_network_status":
                    const detailedNetworkStatus = await monitor.getDetailedNetworkStatus();
                    return {
                        content: [
                            {
                                type: "text",
                                text: `## 상세 네트워크 상태\n\n${JSON.stringify(detailedNetworkStatus, null, 2)}`,
                            },
                        ],
                    };
                case "get_detailed_process_status":
                    const detailedProcessStatus = await monitor.getDetailedProcessStatus();
                    return {
                        content: [
                            {
                                type: "text",
                                text: `## 상세 프로세스 분석\n\n${JSON.stringify(detailedProcessStatus, null, 2)}`,
                            },
                        ],
                    };
                default:
                    throw new Error(`알 수 없는 도구: ${name}`);
            }
        }
        catch (error) {
            Logger.error(`MCP 도구 실행 실패: ${name}`, error);
            return {
                content: [
                    {
                        type: "text",
                        text: `오류 발생: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
                isError: true,
            };
        }
    });
}
main().catch((error) => {
    Logger.error("서버 시작 실패", error);
    console.error("서버 시작 실패:", error);
    process.exit(1);
});
