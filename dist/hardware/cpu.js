import si from "systeminformation";
import { Logger } from "../logger.js";
import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);
export class CpuMonitor {
    async getCpuStatus() {
        const startTime = Date.now();
        Logger.info('CPU 상태 조회 시작');
        try {
            const [cpuData, currentLoad, cpuTemp] = await Promise.all([
                si.cpu(),
                si.currentLoad(),
                si.cpuTemperature().catch(() => null), // 온도 정보가 없을 수 있음
            ]);
            const result = {
                usage: Math.round(currentLoad.currentLoad * 100) / 100,
                cores: cpuData.cores,
                speed: cpuData.speed,
                temperature: cpuTemp?.main || undefined,
                loadAverage: await this.getLoadAverage(),
                model: cpuData.model,
            };
            Logger.info('CPU 상태 조회 완료', {
                usage: result.usage + '%',
                cores: result.cores,
                model: result.model
            });
            Logger.trace('getCpuStatus', startTime);
            return result;
        }
        catch (error) {
            Logger.error('CPU 정보 조회 실패', error);
            throw new Error(`CPU 정보 조회 실패: ${error}`);
        }
    }
    async getDetailedCpuStatus() {
        const startTime = Date.now();
        Logger.info('상세 CPU 상태 조회 시작');
        try {
            // 기본 CPU 정보 가져오기
            const basicCpu = await this.getCpuStatus();
            if (process.platform === 'darwin') {
                Logger.info('macOS 상세 CPU 정보 조회 중...');
                const [cpuDetailResult, temperatureResult, powermeticsResult, iostatResult] = await Promise.all([
                    this.executeSysctlCpu(),
                    this.executeTemperatureSensors(),
                    this.executePowermetrics(),
                    this.executeIostat()
                ]);
                const cpuDetails = this.parseCpuDetails(cpuDetailResult);
                const temperatures = this.parseTemperatures(temperatureResult);
                const powerInfo = this.parsePowermetrics(powermeticsResult);
                const schedulerInfo = this.parseIostat(iostatResult);
                const result = {
                    ...basicCpu,
                    performanceCores: cpuDetails.performanceCores,
                    efficiencyCores: cpuDetails.efficiencyCores,
                    physicalCores: cpuDetails.physicalCores,
                    logicalCores: cpuDetails.logicalCores,
                    temperatures,
                    power: powerInfo,
                    frequencies: cpuDetails.frequencies,
                    coreUsage: cpuDetails.coreUsage,
                    scheduler: schedulerInfo
                };
                Logger.info('상세 CPU 상태 조회 완료', {
                    performanceCores: result.performanceCores,
                    efficiencyCores: result.efficiencyCores,
                    avgTemp: result.temperatures?.cpu,
                    powerUsage: result.power?.packagePower
                });
                Logger.trace('getDetailedCpuStatus', startTime);
                return result;
            }
            else {
                Logger.info('macOS가 아닌 플랫폼에서는 기본 CPU 정보만 제공됩니다');
                return basicCpu;
            }
        }
        catch (error) {
            Logger.error('상세 CPU 정보 조회 실패', error);
            // 오류 발생시 기본 CPU 정보라도 반환
            return await this.getCpuStatus();
        }
    }
    async getLoadAverage() {
        try {
            // macOS/Linux에서 loadavg 사용
            if (process.platform !== 'win32') {
                const os = await import('os');
                return os.loadavg();
            }
            return [0];
        }
        catch {
            return [0];
        }
    }
    async executeSysctlCpu() {
        try {
            const commands = [
                'sysctl -n hw.physicalcpu',
                'sysctl -n hw.logicalcpu',
                'sysctl -n hw.perflevel0.physicalcpu',
                'sysctl -n hw.perflevel1.physicalcpu',
                'sysctl -n hw.cpufrequency_max',
                'sysctl -n hw.cpufrequency_min'
            ];
            const results = await Promise.all(commands.map(cmd => execAsync(cmd).catch(() => ({ stdout: '0' }))));
            return results.map(r => r.stdout.trim()).join('\n');
        }
        catch (error) {
            Logger.warn('sysctl CPU 정보 조회 실패', error);
            return '0\n0\n0\n0\n0\n0';
        }
    }
    async executeTemperatureSensors() {
        try {
            Logger.info('온도 센서 정보 조회 중...');
            // 빠른 온도 조회만 사용 (느린 명령어 제거)
            const commands = [
                'smctemp -c', // CPU 온도 (빠름)
                'smctemp -g', // GPU 온도 (빠름)
                // 느린 smctemp -l 명령어 제거
            ];
            // 타임아웃 3초로 제한
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000));
            const commandPromises = commands.map(cmd => Promise.race([
                execAsync(cmd),
                timeoutPromise
            ]).catch(err => ({ stdout: '', stderr: err.message })));
            const results = await Promise.all(commandPromises);
            // 결과를 구분자로 연결
            return results.map(r => r.stdout ? r.stdout.trim() : '').join('|||');
        }
        catch (error) {
            Logger.error(`온도 센서 조회 실패: ${error}`);
            return '';
        }
    }
    async executePowermetrics() {
        try {
            // 파워 사용량 정보 (권한이 필요할 수 있음)
            const { stdout } = await execAsync('sudo powermetrics -n 1 -i 1000 --samplers cpu_power,gpu_power 2>/dev/null || echo "Power data unavailable"');
            return stdout;
        }
        catch (error) {
            Logger.warn('powermetrics 실행 실패', error);
            return 'Power data unavailable';
        }
    }
    async executeIostat() {
        try {
            // 시스템 통계 정보
            const { stdout } = await execAsync('iostat -c 1 | tail -n +4');
            return stdout;
        }
        catch (error) {
            Logger.warn('iostat 실행 실패', error);
            return '';
        }
    }
    parseCpuDetails(sysctlOutput) {
        const lines = sysctlOutput.split('\n');
        const physicalCores = parseInt(lines[0]) || 0;
        const logicalCores = parseInt(lines[1]) || 0;
        const perfCores = parseInt(lines[2]) || 0;
        const effCores = parseInt(lines[3]) || 0;
        const maxFreq = parseInt(lines[4]) || 0;
        const minFreq = parseInt(lines[5]) || 0;
        return {
            physicalCores,
            logicalCores,
            performanceCores: perfCores,
            efficiencyCores: effCores,
            frequencies: {
                base: Math.round((minFreq / 1000000000) * 100) / 100, // Hz to GHz
                boost: Math.round((maxFreq / 1000000000) * 100) / 100,
                current: [], // 현재 주파수는 다른 방법으로 구해야 함
                avg: Math.round(((maxFreq + minFreq) / 2 / 1000000000) * 100) / 100
            },
            coreUsage: [] // 코어별 사용률도 다른 방법으로 구해야 함
        };
    }
    parseTemperatures(temperatureOutput) {
        try {
            if (!temperatureOutput) {
                return { cpu: 0, cores: [], max: 0, sensors: {} };
            }
            const sections = temperatureOutput.split('|||');
            const [cpuTempStr, gpuTempStr, allSensorsStr, ioregOutput, sysctlOutput] = sections;
            const sensors = {};
            const coreTemps = [];
            // smctemp CPU 온도 파싱
            let cpuTemp = 0;
            if (cpuTempStr && !isNaN(parseFloat(cpuTempStr))) {
                cpuTemp = parseFloat(cpuTempStr);
                sensors['CPU'] = cpuTemp;
                coreTemps.push(cpuTemp);
            }
            // smctemp GPU 온도 파싱  
            if (gpuTempStr && !isNaN(parseFloat(gpuTempStr))) {
                const gpuTemp = parseFloat(gpuTempStr);
                sensors['GPU'] = gpuTemp;
            }
            // 모든 센서 정보 파싱 (smctemp -l 출력)
            if (allSensorsStr) {
                const lines = allSensorsStr.split('\n');
                lines.forEach((line, index) => {
                    const tempMatch = line.match(/(\d+\.?\d*)/);
                    if (tempMatch) {
                        const temp = parseFloat(tempMatch[1]);
                        if (temp > 0 && temp < 150) { // 합리적인 온도 범위
                            sensors[`sensor_${index}`] = temp;
                            if (line.toLowerCase().includes('cpu') || line.toLowerCase().includes('core')) {
                                coreTemps.push(temp);
                            }
                        }
                    }
                });
            }
            // IORegistry에서 추가 온도 정보 파싱
            if (ioregOutput) {
                const lines = ioregOutput.split('\n');
                lines.forEach(line => {
                    const tempMatch = line.match(/"?temperature"?\s*=\s*(\d+\.?\d*)/i);
                    if (tempMatch) {
                        const temp = parseFloat(tempMatch[1]);
                        if (temp > 0 && temp < 150) {
                            sensors[`ioreg_temp`] = temp;
                        }
                    }
                });
            }
            // 최종 CPU 온도 계산
            const validTemps = Object.values(sensors).filter(t => t > 0);
            const finalCpuTemp = cpuTemp > 0 ? cpuTemp : (validTemps.length > 0 ? validTemps[0] : 0);
            const maxTemp = validTemps.length > 0 ? Math.max(...validTemps) : 0;
            const finalCoreTemps = coreTemps.length > 0 ? coreTemps : [finalCpuTemp];
            Logger.info('온도 정보 파싱 완료', {
                cpuTemp: finalCpuTemp,
                maxTemp,
                sensorsCount: Object.keys(sensors).length
            });
            return {
                cpu: Math.round(finalCpuTemp * 10) / 10,
                cores: finalCoreTemps.map(t => Math.round(t * 10) / 10),
                max: Math.round(maxTemp * 10) / 10,
                sensors
            };
        }
        catch (error) {
            Logger.error(`온도 정보 파싱 실패: ${error}`);
            return { cpu: 0, cores: [0], max: 0, sensors: {} };
        }
    }
    parsePowermetrics(powerOutput) {
        const lines = powerOutput.split('\n');
        let packagePower = 0;
        let cpuPower = 0;
        let gpuPower = 0;
        let anePower = 0;
        for (const line of lines) {
            if (line.includes('Package Power')) {
                const match = line.match(/(\d+\.?\d*)/);
                if (match)
                    packagePower = parseFloat(match[1]);
            }
            if (line.includes('CPU Power')) {
                const match = line.match(/(\d+\.?\d*)/);
                if (match)
                    cpuPower = parseFloat(match[1]);
            }
            if (line.includes('GPU Power')) {
                const match = line.match(/(\d+\.?\d*)/);
                if (match)
                    gpuPower = parseFloat(match[1]);
            }
            if (line.includes('ANE Power')) {
                const match = line.match(/(\d+\.?\d*)/);
                if (match)
                    anePower = parseFloat(match[1]);
            }
        }
        return {
            packagePower: packagePower || undefined,
            cpuPower: cpuPower || undefined,
            gpuPower: gpuPower || undefined,
            anePower: anePower || undefined
        };
    }
    parseIostat(iostatOutput) {
        // iostat 출력에서 스케줄러 정보 추출
        const lines = iostatOutput.split('\n');
        let runQueue = 0;
        let contextSwitches = 0;
        let interrupts = 0;
        for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 6) {
                // iostat 출력 포맷에 따라 조정 필요
                contextSwitches = parseInt(parts[4]) || 0;
                interrupts = parseInt(parts[5]) || 0;
            }
        }
        return {
            runQueue,
            contextSwitches,
            interrupts
        };
    }
}
