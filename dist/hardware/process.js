import si from "systeminformation";
import { Logger } from "../logger.js";
import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);
export class ProcessMonitor {
    async getProcessList(sortBy = "cpu", limit = 10) {
        try {
            const processes = await si.processes();
            let sortedProcesses = processes.list
                .filter(proc => proc.cpu > 0 || proc.mem > 0) // 활성 프로세스만
                .map(proc => ({
                pid: proc.pid,
                name: proc.name,
                cpu: Math.round(proc.cpu * 100) / 100,
                memory: Math.round(proc.mem * 100) / 100, // MB
                memoryPercent: Math.round(proc.memRss / (1024 * 1024) * 100) / 100,
            }));
            // 정렬
            switch (sortBy) {
                case "memory":
                    sortedProcesses.sort((a, b) => b.memory - a.memory);
                    break;
                case "name":
                    sortedProcesses.sort((a, b) => a.name.localeCompare(b.name));
                    break;
                default: // cpu
                    sortedProcesses.sort((a, b) => b.cpu - a.cpu);
            }
            return sortedProcesses.slice(0, limit);
        }
        catch (error) {
            throw new Error(`프로세스 목록 조회 실패: ${error}`);
        }
    }
    async getDetailedProcessStatus() {
        const startTime = Date.now();
        Logger.info('프로세스 상세 분석 시작');
        try {
            // 프로세스 정보 수집 (병렬 실행)
            const [psOutput, topOutput, lsofOutput, pstreeOutput] = await Promise.all([
                this.executeDetailedPs(),
                this.executeDetailedTop(),
                this.executeLsofSummary(),
                this.executePstree()
            ]);
            // 데이터 파싱
            const summary = this.parsePsSummary(psOutput);
            const topProcesses = this.parseDetailedProcesses(psOutput, topOutput, lsofOutput);
            const processTree = this.parseProcessTree(pstreeOutput, psOutput);
            const systemServices = this.analyzeSystemServices(topProcesses.byCpu);
            const securityAnalysis = this.analyzeProcessSecurity(topProcesses.byCpu);
            const performanceImpact = this.analyzePerformanceImpact(topProcesses.byCpu, topProcesses.byMemory);
            const result = {
                summary,
                topProcesses,
                processTree,
                systemServices,
                securityAnalysis,
                performanceImpact
            };
            Logger.info('프로세스 상세 분석 완료', {
                totalProcesses: result.summary.totalProcesses,
                runningProcesses: result.summary.runningProcesses,
                topCpuProcess: result.topProcesses.byCpu[0]?.name,
                topMemoryProcess: result.topProcesses.byMemory[0]?.name
            });
            Logger.trace('getDetailedProcessStatus', startTime);
            return result;
        }
        catch (error) {
            Logger.error('프로세스 상세 분석 실패', error);
            // 기본 프로세스 목록이라도 반환
            const basicProcesses = await this.getProcessList('cpu', 20).catch(() => []);
            return this.createBasicProcessStatus(basicProcesses);
        }
    }
    async executeDetailedPs() {
        try {
            // 프로세스 상세 정보 수집
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('ps timeout')), 10000));
            const command = 'ps -eo pid,ppid,pcpu,pmem,rss,vsz,time,comm,args,user,state,pri,nice -r';
            const result = await Promise.race([
                execAsync(command),
                timeoutPromise
            ]).catch(err => ({ stdout: '', stderr: err.message }));
            return result.stdout || '';
        }
        catch (error) {
            Logger.error(`ps 상세 실행 실패: ${error}`);
            return '';
        }
    }
    async executeDetailedTop() {
        try {
            // top을 사용한 상세 프로세스 정보
            const { stdout } = await execAsync('top -l 1 -n 50 -o cpu -s 1');
            return stdout;
        }
        catch (error) {
            Logger.warn('top 상세 실행 실패', error);
            return '';
        }
    }
    async executeLsofSummary() {
        try {
            // 프로세스별 파일 디스크립터 요약
            const { stdout } = await execAsync('lsof -n | awk \'BEGIN{print "PID FD_COUNT"} {fd_count[$2]++} END{for(pid in fd_count) print pid, fd_count[pid]}\' | head -100');
            return stdout;
        }
        catch (error) {
            Logger.warn('lsof 요약 실행 실패', error);
            return '';
        }
    }
    async executePstree() {
        try {
            // 프로세스 트리 (macOS는 pstree가 기본 설치되지 않으므로 ps로 대체)
            const { stdout } = await execAsync('ps -eo pid,ppid,comm | awk \'NR>1{children[$2] = children[$2] " " $1; names[$1] = $3} END{for(ppid in children) if(split(children[ppid], child_array) > 1) print ppid, names[ppid], split(children[ppid], child_array)}\'');
            return stdout;
        }
        catch (error) {
            Logger.warn('프로세스 트리 분석 실패', error);
            return '';
        }
    }
    parsePsSummary(psOutput) {
        let totalProcesses = 0;
        let runningProcesses = 0;
        let sleepingProcesses = 0;
        let zombieProcesses = 0;
        let totalThreads = 0;
        try {
            if (!psOutput)
                return this.getEmptyPsSummary();
            const lines = psOutput.split('\n');
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line)
                    continue;
                const parts = line.split(/\s+/);
                if (parts.length < 12)
                    continue;
                totalProcesses++;
                const state = parts[10] || 'unknown';
                const threads = 1; // macOS에서는 스레드 수를 직접 가져올 수 없음
                if (state.includes('R'))
                    runningProcesses++;
                else if (state.includes('S') || state.includes('I'))
                    sleepingProcesses++;
                else if (state.includes('Z'))
                    zombieProcesses++;
                totalThreads += threads;
            }
            return {
                totalProcesses,
                runningProcesses,
                sleepingProcesses,
                zombieProcesses,
                totalThreads
            };
        }
        catch (error) {
            Logger.error('ps 요약 파싱 실패', error);
            return this.getEmptyPsSummary();
        }
    }
    parseDetailedProcesses(psOutput, topOutput, lsofOutput) {
        const fdCounts = this.parseLsofSummary(lsofOutput);
        const processMap = new Map();
        try {
            if (!psOutput)
                return this.getEmptyTopProcesses();
            const lines = psOutput.split('\n');
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line)
                    continue;
                const parts = line.split(/\s+/);
                if (parts.length < 12)
                    continue;
                const pid = parseInt(parts[0]);
                const ppid = parseInt(parts[1]);
                const cpu = parseFloat(parts[2]) || 0;
                const memoryPercent = parseFloat(parts[3]) || 0;
                const rss = parseInt(parts[4]) || 0; // KB
                const vsz = parseInt(parts[5]) || 0; // KB
                const cpuTime = parts[6] || '0:00.00';
                const command = parts[7] || 'unknown';
                const user = parts[9] || 'unknown';
                const state = parts[10] || 'unknown';
                const priority = parseInt(parts[11]) || 0;
                const nice = parseInt(parts[12]) || 0;
                const threads = 1; // macOS에서는 개별 스레드 정보를 직접 가져올 수 없음
                // 메모리 MB로 변환
                const memory = Math.round(rss / 1024 * 100) / 100;
                // 전체 명령어 추출
                const argsStartIndex = line.indexOf(parts[8]);
                const fullCommand = argsStartIndex > 0 ? line.substring(argsStartIndex) : command;
                const processInfo = {
                    pid,
                    ppid,
                    name: command,
                    command: fullCommand,
                    user,
                    cpu,
                    memory,
                    memoryPercent,
                    memoryDetails: {
                        rss,
                        vsz,
                        shared: Math.round(rss * 0.1), // 추정값
                        private: Math.round(rss * 0.9)
                    },
                    timeInfo: {
                        cpuTime,
                        startTime: Date.now() - (this.parseCpuTime(cpuTime) * 1000),
                        runTime: this.parseCpuTime(cpuTime)
                    },
                    resources: {
                        threads,
                        fileDescriptors: fdCounts.get(pid) || 0,
                        openFiles: fdCounts.get(pid) || 0,
                        ports: 0 // macOS specific, requires additional parsing
                    },
                    status: {
                        state,
                        priority,
                        nice,
                        contextSwitches: 0 // requires additional data
                    }
                };
                processMap.set(pid, processInfo);
            }
            // 정렬된 배열들 생성
            const allProcesses = Array.from(processMap.values());
            const byCpu = allProcesses
                .filter(p => p.cpu > 0.1)
                .sort((a, b) => b.cpu - a.cpu)
                .slice(0, 20);
            const byMemory = allProcesses
                .filter(p => p.memory > 10)
                .sort((a, b) => b.memory - a.memory)
                .slice(0, 20)
                .map(p => ({
                pid: p.pid,
                name: p.name,
                memory: p.memory,
                memoryPercent: p.memoryPercent,
                cpu: p.cpu,
                user: p.user
            }));
            const byFileDescriptors = allProcesses
                .filter(p => p.resources.fileDescriptors > 10)
                .sort((a, b) => b.resources.fileDescriptors - a.resources.fileDescriptors)
                .slice(0, 15)
                .map(p => ({
                pid: p.pid,
                name: p.name,
                fileDescriptors: p.resources.fileDescriptors,
                openFiles: p.resources.openFiles,
                user: p.user
            }));
            return {
                byCpu,
                byMemory,
                byFileDescriptors
            };
        }
        catch (error) {
            Logger.error('상세 프로세스 파싱 실패', error);
            return this.getEmptyTopProcesses();
        }
    }
    parseProcessTree(pstreeOutput, psOutput) {
        // 간소화된 프로세스 트리 분석
        try {
            const topParents = [];
            // 실제 구현에서는 ppid를 기반으로 부모-자식 관계를 구축하고 분석
            // 여기서는 간소화된 버전으로 대체
            return { topParents };
        }
        catch (error) {
            Logger.error('프로세스 트리 파싱 실패', error);
            return { topParents: [] };
        }
    }
    analyzeSystemServices(topCpuProcesses) {
        const systemServiceNames = [
            'launchd', 'kernel', 'WindowServer', 'loginwindow', 'Finder',
            'coreaudiod', 'bluetoothd', 'wifid', 'networkd', 'cfprefsd'
        ];
        const criticalServices = topCpuProcesses
            .filter(p => systemServiceNames.some(name => p.name.includes(name)))
            .map(p => ({
            name: p.name,
            pid: p.pid,
            status: 'running',
            cpu: p.cpu,
            memory: p.memory,
            restarts: 0 // 추정 불가
        }));
        const heavyServices = topCpuProcesses
            .filter(p => p.cpu > 5.0 || p.memory > 500)
            .slice(0, 10)
            .map(p => ({
            name: p.name,
            pid: p.pid,
            cpu: p.cpu,
            memory: p.memory,
            impact: (p.cpu > 20 || p.memory > 1000) ? 'high' :
                (p.cpu > 10 || p.memory > 500) ? 'medium' : 'low'
        }));
        return {
            criticalServices,
            heavyServices
        };
    }
    analyzeProcessSecurity(topCpuProcesses) {
        const rootProcesses = topCpuProcesses
            .filter(p => p.user === 'root')
            .map(p => ({
            pid: p.pid,
            name: p.name,
            command: p.command,
            cpu: p.cpu,
            memory: p.memory
        }));
        const suspiciousProcesses = topCpuProcesses
            .filter(p => (p.cpu > 50 && !this.isKnownProcess(p.name)) ||
            (p.memory > 2000 && !this.isKnownProcess(p.name)) ||
            (p.resources.fileDescriptors > 1000))
            .map(p => ({
            pid: p.pid,
            name: p.name,
            reason: this.getSuspiciousReason(p),
            cpu: p.cpu,
            memory: p.memory,
            fileDescriptors: p.resources.fileDescriptors
        }));
        return {
            rootProcesses,
            suspiciousProcesses
        };
    }
    analyzePerformanceImpact(topCpuProcesses, topMemoryProcesses) {
        const cpuBottlenecks = topCpuProcesses
            .filter(p => p.cpu > 15)
            .slice(0, 5)
            .map(p => ({
            pid: p.pid,
            name: p.name,
            cpu: p.cpu,
            impact: Math.min(Math.round(p.cpu * 2), 100),
            recommendation: this.getCpuRecommendation(p)
        }));
        const memoryBottlenecks = topMemoryProcesses
            .filter(p => p.memoryPercent > 5)
            .slice(0, 5)
            .map(p => ({
            pid: p.pid,
            name: p.name,
            memory: p.memory,
            memoryPercent: p.memoryPercent,
            impact: Math.min(Math.round(p.memoryPercent * 10), 100),
            recommendation: this.getMemoryRecommendation(p)
        }));
        const ioIntensiveProcesses = topCpuProcesses
            .filter(p => p.resources.fileDescriptors > 50)
            .slice(0, 5)
            .map(p => ({
            pid: p.pid,
            name: p.name,
            fileDescriptors: p.resources.fileDescriptors,
            diskReads: 0, // 추가 분석 필요
            diskWrites: 0,
            networkConnections: 0
        }));
        return {
            cpuBottlenecks,
            memoryBottlenecks,
            ioIntensiveProcesses
        };
    }
    // 유틸리티 메서드들
    parseLsofSummary(lsofOutput) {
        const fdCounts = new Map();
        try {
            if (!lsofOutput)
                return fdCounts;
            const lines = lsofOutput.split('\n');
            for (const line of lines) {
                if (line.includes('PID FD_COUNT'))
                    continue;
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 2) {
                    const pid = parseInt(parts[0]);
                    const count = parseInt(parts[1]);
                    if (!isNaN(pid) && !isNaN(count)) {
                        fdCounts.set(pid, count);
                    }
                }
            }
            return fdCounts;
        }
        catch (error) {
            Logger.error('lsof 요약 파싱 실패', error);
            return fdCounts;
        }
    }
    parseCpuTime(timeString) {
        try {
            const parts = timeString.split(':');
            if (parts.length === 2) {
                const [minutes, seconds] = parts;
                return parseInt(minutes) * 60 + parseFloat(seconds);
            }
            return 0;
        }
        catch {
            return 0;
        }
    }
    isKnownProcess(name) {
        const knownProcesses = [
            'kernel', 'launchd', 'WindowServer', 'Finder', 'loginwindow',
            'coreaudiod', 'bluetoothd', 'cfprefsd', 'mds', 'mdworker',
            'Google Chrome', 'Cursor', 'Slack', 'Safari', 'Terminal',
            'node', 'python', 'java', 'firefox', 'docker'
        ];
        return knownProcesses.some(known => name.toLowerCase().includes(known.toLowerCase()));
    }
    getSuspiciousReason(process) {
        if (process.cpu > 50)
            return 'High CPU usage';
        if (process.memory > 2000)
            return 'High memory usage';
        if (process.resources.fileDescriptors > 1000)
            return 'Excessive file descriptors';
        return 'Unknown process with high resource usage';
    }
    getCpuRecommendation(process) {
        if (process.cpu > 80)
            return '프로세스 재시작 또는 종료 고려';
        if (process.cpu > 50)
            return '프로세스 최적화 또는 리소스 제한 설정';
        if (process.cpu > 30)
            return '백그라운드 작업 시간 조정';
        return '모니터링 지속';
    }
    getMemoryRecommendation(process) {
        if (process.memoryPercent > 20)
            return '메모리 누수 확인 및 프로세스 재시작';
        if (process.memoryPercent > 10)
            return '메모리 사용량 모니터링 강화';
        if (process.memoryPercent > 5)
            return '메모리 최적화 검토';
        return '정상 범위';
    }
    createBasicProcessStatus(processes) {
        const byCpu = processes.slice(0, 10).map(p => ({
            pid: p.pid,
            ppid: 0,
            name: p.name,
            command: p.name,
            user: 'unknown',
            cpu: p.cpu,
            memory: p.memory,
            memoryPercent: p.memoryPercent,
            memoryDetails: {
                rss: Math.round(p.memory * 1024),
                vsz: Math.round(p.memory * 1024 * 2),
                shared: 0,
                private: Math.round(p.memory * 1024)
            },
            timeInfo: {
                cpuTime: '0:00.00',
                startTime: Date.now(),
                runTime: 0
            },
            resources: {
                threads: 1,
                fileDescriptors: 0,
                openFiles: 0,
                ports: 0
            },
            status: {
                state: 'running',
                priority: 0,
                nice: 0,
                contextSwitches: 0
            }
        }));
        return {
            summary: {
                totalProcesses: processes.length,
                runningProcesses: processes.length,
                sleepingProcesses: 0,
                zombieProcesses: 0,
                totalThreads: processes.length
            },
            topProcesses: {
                byCpu,
                byMemory: [],
                byFileDescriptors: []
            }
        };
    }
    getEmptyPsSummary() {
        return {
            totalProcesses: 0,
            runningProcesses: 0,
            sleepingProcesses: 0,
            zombieProcesses: 0,
            totalThreads: 0
        };
    }
    getEmptyTopProcesses() {
        return {
            byCpu: [],
            byMemory: [],
            byFileDescriptors: []
        };
    }
}
