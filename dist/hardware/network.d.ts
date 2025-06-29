import { NetworkStatus, DetailedNetworkStatus } from "./types.js";
export declare class NetworkMonitor {
    getNetworkStatus(): Promise<NetworkStatus>;
    getDetailedNetworkStatus(): Promise<DetailedNetworkStatus>;
    private executeNetstat;
    private executeNettop;
    private executeIfconfig;
    private executeWifiInfo;
    private executePingTest;
    private parseNetstat;
    private parseNettop;
    private parseIfconfig;
    private parseWifiInfo;
    private parsePingStats;
    private findActiveInterface;
    private parseByteValue;
    private calculateSignalQuality;
    private channelToFrequency;
    private getEmptyConnectionAnalysis;
    private getEmptyRealTimeStats;
}
