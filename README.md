# SysMCP - 시스템 모니터링 MCP 서버

macOS 시스템 정보를 실시간으로 모니터링하는 Model Context Protocol (MCP) 서버입니다.

## 주요 기능

- **CPU 모니터링**: 사용률, 코어 정보, 온도, 주파수 등
- **메모리 분석**: 사용량, 압축 메모리, 메모리 압박 상태 등
- **GPU 상태**: Apple Silicon GPU 활용률, VRAM, 온도, 전력 등
- **네트워크 모니터링**: 대역폭, WiFi 상태, 연결 분석 등
- **디스크 I/O**: 사용량, 읽기/쓰기 통계 등
- **프로세스 분석**: 리소스 사용량, 보안 분석, 성능 영향 평가
- **시스템 종합 분석**: 병목 지점 탐지 및 최적화 제안

## 설치 및 설정

### 1. 프로젝트 설치

```bash
git clone <repository-url>
cd SysMCP
npm install
```

### 2. 빌드

```bash
npm run build
```

### 3. Claude Desktop 설정

`claude_desktop_config.json` 파일 (보통 `~/Library/Application Support/Claude/` 경로)에 다음 설정을 추가하세요:

```json
{
  "mcpServers": {
    "sysmcp": {
      "command": "node",
      "args": ["/Users/dev-garam/Desktop/workspace/mcp/SysMCP/dist/index.js"],
      "env": {}
    }
  }
}
```

**주의**: `args` 배열의 경로를 실제 프로젝트 위치에 맞게 수정하세요.

### 4. Claude Desktop 재시작

설정 후 Claude Desktop을 완전히 종료하고 재시작하세요.

## 사용법

Claude Desktop에서 다음과 같이 질문하세요:

### 기본 모니터링
- "시스템 상태 확인해줘"
- "CPU 사용률 보여줘"
- "메모리 사용량 확인해줘"
- "디스크 용량 남은거 얼마야?"

### 상세 분석
- "메모리 압박 상태 분석해줘"
- "CPU 온도와 전력 소모량 보여줘"
- "GPU 사용률과 활성 프로세스 확인해줘"
- "네트워크 대역폭 실시간 모니터링해줘"

### 성능 분석
- "시스템 병목 지점 찾아줘"
- "성능에 영향주는 프로세스들 분석해줘"
- "메모리 누수 의심되는 프로세스 찾아줘"
- "CPU 사용률 높은 프로세스 상위 10개 보여줘"

## 개발

### 개발 모드 실행

```bash
npm run dev
```

### 빌드

```bash
npm run build
```

### 테스트 실행

```bash
./start_server.sh
```

## MCP 도구 목록

| 도구명 | 설명 |
|--------|------|
| `get_system_overview` | 전체 시스템 상태 종합 분석 |
| `get_cpu_status` | 기본 CPU 정보 |
| `get_detailed_cpu_status` | 상세 CPU 분석 (온도, 전력, 주파수) |
| `get_memory_status` | 기본 메모리 정보 |
| `get_detailed_memory_status` | 상세 메모리 분석 (압축, 캐시, 압박도) |
| `get_gpu_status` | 기본 GPU 정보 |
| `get_detailed_gpu_status` | 상세 GPU 분석 (활용률, 온도, 프로세스) |
| `get_network_status` | 기본 네트워크 정보 |
| `get_detailed_network_status` | 상세 네트워크 분석 (대역폭, WiFi, 품질) |
| `get_disk_status` | 디스크 사용량 및 I/O |
| `get_process_list` | 프로세스 목록 |
| `get_detailed_process_status` | 상세 프로세스 분석 |

## 시스템 요구사항

- **운영체제**: macOS (Apple Silicon 최적화)
- **Node.js**: 18.x 이상
- **권한**: 시스템 모니터링을 위한 기본 권한

## 문제 해결

### 서버가 시작되지 않는 경우

1. Node.js 버전 확인: `node --version`
2. 빌드 상태 확인: `npm run build`
3. 권한 확인: 터미널에서 시스템 명령어 실행 권한

### Claude Desktop에서 인식되지 않는 경우

1. 설정 파일 경로가 올바른지 확인
2. JSON 문법 오류가 없는지 확인
3. Claude Desktop 완전 재시작
4. 로그 확인: `~/Library/Logs/Claude/`

### 성능 이슈

- 상세 분석 도구들은 시스템 리소스를 더 많이 사용합니다
- 필요에 따라 기본 도구들을 우선 사용하세요

## 라이선스

MIT License 