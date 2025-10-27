import { ChannelMap } from "../types/misc.js";
import { addLogEntry, updateStatus } from "../ui-logic.js";
import { RestAPI } from "../vencord/stores.js";
import { RestAPIResponse } from "../vencord/types.js";
import { formatTime } from "./formatTime.js";
import safePromise from "./safePromise.js";
import { wait } from "./waiter.js";

export const MINIMIZED_STATE_KEY = "discorchDeleterMinimized";
export const JSON_CONTENT_KEY = "discorchDeleterJsonContent";
export const INTERVAL_KEY = "discorchDeleterInterval";
export const INPUT_METHOD_KEY = "discorchDeleterInputMethod";
export const DELETEION_PROGRESS_KEY = "discorchDeleterDeletionProgress";
export const DELETION_STATS_KEY = "discorchDeleterDeletionStats";
export const POSITION_KEY = "discorchDeleterPosition";
export const SIZE_KEY = "discorchDeleterSize";

const DEFAULTS = {
    [MINIMIZED_STATE_KEY]: false,
    [JSON_CONTENT_KEY]: "",
    [INTERVAL_KEY]: "1500",
    [INPUT_METHOD_KEY]: "file" as 'file' | 'paste',
};

/**
 * Interface for storing deletion statistics
 */
export interface DeletionStats {
    totalDeleted: number;
    deletedByChannelType: {
        [channelType: string]: number;
    };
}

/**
 * Interface for storing deleted message IDs to prevent re-deletion
 */
export interface DeletedMessages {
    messageIds: Set<string>; // Using Set for O(1) lookups
}

export class AppSettingsStore {
    private static _instance: AppSettingsStore;
    private _deletedMessagesSet: Set<string> | null = null;
    private _deletionStats: DeletionStats | null = null;

    public static get instance(): AppSettingsStore {
        if (!AppSettingsStore._instance) {
            AppSettingsStore._instance = new AppSettingsStore();
        }
        return AppSettingsStore._instance;
    }

    private getValue<T>(key: string, defaultValue: T): T {
        return GM_getValue(key, defaultValue) as T || defaultValue;
    }

    private setValue<T>(key: string, value: T): void {
        GM_setValue(key, value);
    }

    public isMinimized(): boolean {
        return this.getValue(MINIMIZED_STATE_KEY, DEFAULTS[MINIMIZED_STATE_KEY]);
    }

    public setMinimized(isMinimized: boolean): void {
        this.setValue(MINIMIZED_STATE_KEY, isMinimized);
    }

    public toggleMinimized(): boolean {
        const current = this.isMinimized();
        this.setMinimized(!current);
        return !current;
    }

    public getJsonContent(): string {
        return this.getValue(JSON_CONTENT_KEY, DEFAULTS[JSON_CONTENT_KEY]);
    }

    public setJsonContent(content: string): void {
        this.setValue(JSON_CONTENT_KEY, content);
    }

    public getInterval(): number {
        return parseInt(this.getValue(INTERVAL_KEY, DEFAULTS[INTERVAL_KEY]), 10);
    }

    public setInterval(interval: string): void {
        this.setValue(INTERVAL_KEY, interval);
    }

    public getInputMethod(): 'file' | 'paste' {
        return this.getValue(INPUT_METHOD_KEY, DEFAULTS[INPUT_METHOD_KEY]);
    }

    public setInputMethod(method: 'file' | 'paste'): void {
        this.setValue(INPUT_METHOD_KEY, method);
    }

    public getDeletionStats(): DeletionStats {
        if (!this._deletionStats) {
            this._deletionStats = this.getValue<DeletionStats>(DELETION_STATS_KEY, {
                totalDeleted: 0,
                deletedByChannelType: {}
            });
        }
        return this._deletionStats;
    }

    public setDeletionStats(stats: DeletionStats): void {
        this._deletionStats = stats;
        this.setValue(DELETION_STATS_KEY, stats);
    }

    public updateDeletionStats(channelType: string): void {
        const stats = this.getDeletionStats();
        stats.totalDeleted += 1;
        stats.deletedByChannelType[channelType] = (stats.deletedByChannelType[channelType] || 0) + 1;
        this.setDeletionStats(stats);
    }

    public getDeletedMessagesSet(): Set<string> {
        if (!this._deletedMessagesSet) {
            const stored = this.getValue<{messageIds: string[]}>(DELETEION_PROGRESS_KEY, {
                messageIds: []
            });
            this._deletedMessagesSet = new Set(stored.messageIds);
        }
        return this._deletedMessagesSet;
    }

    public resetDeletedMessagesSet(): void {
        this._deletedMessagesSet = null;
        this.setValue(DELETEION_PROGRESS_KEY, { messageIds: [] });
    }

    private _pendingSaveTimeout: number | null = null;
    private _hasChanges = false;
    
    public saveDeletedMessagesIfNeeded(): void {
        if (this._hasChanges && this._deletedMessagesSet) {
            if (this._pendingSaveTimeout !== null) {
                clearTimeout(this._pendingSaveTimeout);
                this._pendingSaveTimeout = null;
            }
            
            this.setValue(DELETEION_PROGRESS_KEY, {
                messageIds: Array.from(this._deletedMessagesSet)
            });
            this._hasChanges = false;
        }
    }

    public markMessageAsDeleted(messageId: string): void {
        const set = this.getDeletedMessagesSet();
        if (!set.has(messageId)) {
            set.add(messageId);
            this._hasChanges = true;
            
            if (this._pendingSaveTimeout === null) {
                this._pendingSaveTimeout = window.setTimeout(() => {
                    this.saveDeletedMessagesIfNeeded();
                    this._pendingSaveTimeout = null;
                }, 2000);
            }
        }
    }

    public isMessageDeleted(messageId: string): boolean {
        return this.getDeletedMessagesSet().has(messageId);
    }

    public getPosition(): { top: number; left: number } {
        return this.getValue<{ top: number; left: number }>(POSITION_KEY, {
            top: 20,
            left: window.innerWidth - 420
        });
    }

    public setPosition(position: { top: number; left: number }): void {
        this.setValue(POSITION_KEY, position);
    }

    public getSize(): { width: number; height: number | 'auto' } {
        return this.getValue<{ width: number; height: number | 'auto' }>(SIZE_KEY, {
            width: 400,
            height: 'auto'
        });
    }

    public setSize(size: { width: number; height: number | 'auto' }): void {
        this.setValue(SIZE_KEY, size);
    }

    public clearAllKeys(): void {
        GM_deleteValue(MINIMIZED_STATE_KEY);
        GM_deleteValue(JSON_CONTENT_KEY);
        GM_deleteValue(INTERVAL_KEY);
        GM_deleteValue(INPUT_METHOD_KEY);
        GM_deleteValue(DELETEION_PROGRESS_KEY);
        GM_deleteValue(DELETION_STATS_KEY);
        GM_deleteValue(POSITION_KEY);
        GM_deleteValue(SIZE_KEY);
        
        this._deletedMessagesSet = null;
        this._deletionStats = null;
    }
} 

export class DeletionStore {
    /**
     * Channel ID -> if we have view channel permissions to that channel
     */
    private calculatedPermissions: { [channelId: string]: boolean } = {};
    private isRunning: boolean = false;
    private messageToChannelMap: Map<string, string> | null = null;

    private static _instance: DeletionStore;

    public static get instance(): DeletionStore {
        if (!DeletionStore._instance) {
            DeletionStore._instance = new DeletionStore();
        }
        return DeletionStore._instance;
    }

    /**
     * Calculates if we have view channel permissions to a channel
     * @param channelId - The ID of the channel to check
     * @returns Whether we have view channel permissions to the channel
     */
    public calculatePermission(channelId: string): boolean {
        if (this.calculatedPermissions[channelId] !== undefined) {
            return this.calculatedPermissions[channelId];
        }

        const channel = Vencord.Webpack.Common.ChannelStore.getChannel(channelId);
        
        if (channel && channel.type === 1) {
            this.calculatedPermissions[channelId] = true;
            return true;
        }

        const canViewChannel = Vencord.Webpack.Common.PermissionStore.can(0x400n, channel);
        this.calculatedPermissions[channelId] = canViewChannel;
        return canViewChannel;
    }

    /**
     * Calculates if we have view channel permissions to all channels in a map
     * @param map - The map of channels to check
     * @returns A map of channel IDs to whether we have view channel permissions to that channel
     */
    public calculatePermissions(map: ChannelMap): { [channelId: string]: boolean } {
        return Object.fromEntries(Object.entries(map).map(([channelId, _]) => [channelId, this.calculatePermission(channelId)]));
    }

    /**
     * Removes a message ID from the channel map to save memory
     * @param map - The channel map to modify
     * @param messageId - The message ID to remove
     * @returns Information about the removed message (channel ID and type) or null if not found
     */
    private removeMessageFromMap(map: ChannelMap, messageId: string): { channelId: string, channelType: string } | null {
        if (this.messageToChannelMap && this.messageToChannelMap.has(messageId)) {
            const channelId = this.messageToChannelMap.get(messageId)!;
            if (map[channelId]) {
                const channel = map[channelId];
                const index = channel.messageIds.indexOf(messageId);
                if (index !== -1) {
                    channel.messageIds.splice(index, 1);
                    this.messageToChannelMap.delete(messageId);
                    return { channelId, channelType: channel.channelType };
                }
            }
            return null;
        }
        
        for (const [channelId, channel] of Object.entries(map)) {
            const index = channel.messageIds.indexOf(messageId);
            if (index !== -1) {
                channel.messageIds.splice(index, 1);
                return { channelId, channelType: channel.channelType };
            }
        }
        return null; 
    }

    /**
     * Stops the deletion process completely
     */
    public stopDeletion(): void {
        if (this.isRunning) {
            this.isRunning = false;
            addLogEntry("Deletion process stopped", "WARN");
            
            AppSettingsStore.instance.saveDeletedMessagesIfNeeded();
        }
    }

    /**
     * Checks if the deletion process is currently running
     */
    public isDeletionRunning(): boolean {
        return this.isRunning;
    }

    private async deleteMessage(channelId: string, messageId: string): Promise<boolean> {
        const [, err] = await safePromise(RestAPI.del(`/channels/${channelId}/messages/${messageId}`)) as unknown as [void, RestAPIResponse]

        if (err) {
            switch (err.status) {
                case 404: {
                    addLogEntry(`Message ${messageId} not found, likely already deleted`, "ERROR", err.body);
                    AppSettingsStore.instance.markMessageAsDeleted(messageId);
                    return false;
                }

                case 403: {
                    addLogEntry(`Message ${messageId} is not deletable`, "ERROR", err.body);
                    AppSettingsStore.instance.markMessageAsDeleted(messageId);
                    return false;
                }

                case 429: {
                    addLogEntry(`Rate limited while deleting message ${messageId}`, "ERROR", err.body);
                    await wait((err.body as { retry_after: number }).retry_after * 1000);
                    return await this.deleteMessage(channelId, messageId);
                }

                default: {
                    addLogEntry(`Failed to delete message ${messageId}`, "ERROR", err.body);
                    return false;
                }
            }
        } else {
            addLogEntry(`Deleted message ${messageId}`, "INFO");
            AppSettingsStore.instance.markMessageAsDeleted(messageId);
            return true;
        }
    }

    /**
     * Updates the UI status with setTimeout to avoid UI freezes and ensure background processing
     */
    private scheduleUpdateStatus(message: string, progress: number, etaMessage?: string): void {
        setTimeout(() => updateStatus(message, progress, etaMessage), 0);
    }

    /**
     * Starts the deletion process
     * @param map - The map of channels to delete messages from
     */
    public async startDeletion(map: ChannelMap): Promise<void> {
        if (this.isRunning) {
            addLogEntry("Deletion process is already running", "WARN");
            return;
        }
        
        this.isRunning = true;

        this.scheduleUpdateStatus("Calculating permissions...", 0, "Checking channel access...");
        addLogEntry("Starting permission calculations...", "INFO");
        
        await new Promise(resolve => setTimeout(resolve, 0));
        
        const channelIds = Object.keys(map);
        const channelCount = channelIds.length;
        let processedChannels = 0;
        
        const permissions: { [channelId: string]: boolean } = {};
        const CHUNK_SIZE = 100;
        
        for (let i = 0; i < channelIds.length; i += CHUNK_SIZE) {
            if (!this.isRunning) break;
            
            const chunk = channelIds.slice(i, i + CHUNK_SIZE);
            
            for (const channelId of chunk) {
                permissions[channelId] = this.calculatePermission(channelId);
                processedChannels++;
            }
            
            const permissionProgress = (processedChannels / channelCount) * 100;
            this.scheduleUpdateStatus(
                `Calculating permissions... (${processedChannels}/${channelCount} channels)`, 
                permissionProgress,
                "Preparing to delete messages..."
            );
            
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        
        addLogEntry(`Finished calculating permissions for ${processedChannels} channels`, "INFO");
        
        this.messageToChannelMap = new Map();
        
        for (const [channelId, canAccess] of Object.entries(permissions)) {
            if (!canAccess && map[channelId]) {
                const found = map[channelId];
                addLogEntry(`Cannot access ${found.displayName} ${found.serverName ? `in ${found.serverName}` : ""} (${channelId})`, "ERROR");
            }
        }
        
        const messageToProcess: {id: string, channelId: string}[] = [];
        const deletedMessagesSet = AppSettingsStore.instance.getDeletedMessagesSet();
        let totalMessageCount = 0;
        
        for (const [channelId, canAccess] of Object.entries(permissions)) {
            if (canAccess && map[channelId]) {
                for (const messageId of map[channelId].messageIds) {
                    totalMessageCount++;
                    
                    if (!deletedMessagesSet.has(messageId)) {
                        messageToProcess.push({id: messageId, channelId});
                    }
                    
                    this.messageToChannelMap.set(messageId, channelId);
                }
            }
        }
        
        const alreadyDeletedCount = totalMessageCount - messageToProcess.length;
        const remainingToDeleteCount = messageToProcess.length;
        const stats = AppSettingsStore.instance.getDeletionStats();
        
        addLogEntry(`Found ${totalMessageCount} messages total`, "INFO");
        
        if (alreadyDeletedCount > 0) {
            addLogEntry(`${alreadyDeletedCount} messages already deleted in previous sessions (skipping)`, "INFO");
        }
        
        addLogEntry(`${remainingToDeleteCount} messages will be processed for deletion`, "INFO");
        addLogEntry(`${stats.totalDeleted} messages deleted overall in previous sessions`, "INFO");

        const etaTime = remainingToDeleteCount * AppSettingsStore.instance.getInterval();

        const initialProgress = totalMessageCount > 0 ? (alreadyDeletedCount / totalMessageCount) * 100 : 0;
        this.scheduleUpdateStatus(
            `Deleting messages... (${alreadyDeletedCount}/${totalMessageCount} complete)`, 
            initialProgress,
            `${formatTime(etaTime)} remaining`
        );

        let completedCount = 0;
        let processedCount = 0;
        let lastUIUpdateTime = performance.now();
        const UI_UPDATE_INTERVAL = 500;
        
        const workingMap = JSON.parse(JSON.stringify(map)) as ChannelMap;
        
        for (const {id: messageId, channelId} of messageToProcess) {
            if (!this.isRunning) break;
            
            processedCount++;
            
            const wasDeleted = await this.deleteMessage(channelId, messageId);
            
            if (wasDeleted) {
                completedCount++;
                
                const removed = this.removeMessageFromMap(workingMap, messageId);
                
                if (removed) {
                    AppSettingsStore.instance.updateDeletionStats(removed.channelType);
                }
            } else {
                this.removeMessageFromMap(workingMap, messageId);
            }
            
            const currentTime = performance.now();
            if (currentTime - lastUIUpdateTime > UI_UPDATE_INTERVAL) {
                const remainingMessages = remainingToDeleteCount - processedCount;
                const overallProgress = totalMessageCount > 0 ? 
                    ((alreadyDeletedCount + processedCount) / totalMessageCount) * 100 : 100;
                
                this.scheduleUpdateStatus(
                    `Deleting messages... (${processedCount + alreadyDeletedCount}/${totalMessageCount} complete)`, 
                    overallProgress,
                    remainingMessages > 0 ? `${formatTime(remainingMessages * AppSettingsStore.instance.getInterval())} remaining` : "Almost done"
                );
                
                lastUIUpdateTime = currentTime;
                
                AppSettingsStore.instance.saveDeletedMessagesIfNeeded();
                
                await new Promise(resolve => setTimeout(resolve, 0));
            }
            
            await wait(AppSettingsStore.instance.getInterval());
        }

        if (this.isRunning) {
            for (const messageId of deletedMessagesSet) {
                this.removeMessageFromMap(workingMap, messageId);
            }
        }
        
        AppSettingsStore.instance.saveDeletedMessagesIfNeeded();
        
        if (!this.isRunning) {
            this.scheduleUpdateStatus(`Stopped (deletion incomplete)`, 0);
            addLogEntry("Deletion process was stopped by user", "WARN");
        } else {
            const updatedJsonContent = JSON.stringify(workingMap);
            AppSettingsStore.instance.setJsonContent(updatedJsonContent);
            
            const currentStats = AppSettingsStore.instance.getDeletionStats();
            
            addLogEntry(`Deletion complete. ${completedCount} messages deleted this session.`, "INFO");
            addLogEntry(`${alreadyDeletedCount} messages were already deleted and skipped.`, "INFO");
            addLogEntry(`Total: ${currentStats.totalDeleted} messages deleted overall.`, "INFO");
            
            this.scheduleUpdateStatus("Deletion complete", 100);
        }
        
        this.isRunning = false;
        this.messageToChannelMap = null;
    }
}