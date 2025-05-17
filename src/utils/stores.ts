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
    messageIds: string[];
}

export class AppSettingsStore {
    private static _instance: AppSettingsStore;

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
        return this.getValue<DeletionStats>(DELETION_STATS_KEY, {
            totalDeleted: 0,
            deletedByChannelType: {}
        });
    }

    public setDeletionStats(stats: DeletionStats): void {
        this.setValue(DELETION_STATS_KEY, stats);
    }

    public updateDeletionStats(channelType: string): void {
        const stats = this.getDeletionStats();
        stats.totalDeleted += 1;
        stats.deletedByChannelType[channelType] = (stats.deletedByChannelType[channelType] || 0) + 1;
        this.setDeletionStats(stats);
    }

    public getDeletedMessages(): DeletedMessages {
        return this.getValue<DeletedMessages>(DELETEION_PROGRESS_KEY, {
            messageIds: []
        });
    }

    public setDeletedMessages(messages: DeletedMessages): void {
        this.setValue(DELETEION_PROGRESS_KEY, messages);
    }

    public markMessageAsDeleted(messageId: string): void {
        const deletedMessages = this.getDeletedMessages();
        if (!deletedMessages.messageIds.includes(messageId)) {
            deletedMessages.messageIds.push(messageId);
            this.setDeletedMessages(deletedMessages);
        }
    }

    public isMessageDeleted(messageId: string): boolean {
        const deletedMessages = this.getDeletedMessages();
        return deletedMessages.messageIds.includes(messageId);
    }

    public clearAllKeys(): void {
        GM_deleteValue(MINIMIZED_STATE_KEY);
        GM_deleteValue(JSON_CONTENT_KEY);
        GM_deleteValue(INTERVAL_KEY);
        GM_deleteValue(INPUT_METHOD_KEY);
        GM_deleteValue(DELETEION_PROGRESS_KEY);
        GM_deleteValue(DELETION_STATS_KEY);
    }
} 

export class DeletionStore {
    /**
     * Channel ID -> if we have view channel permissions to that channel
     */
    private calculatedPermissions: { [channelId: string]: boolean } = {};
    
    
    private isRunning: boolean = false;

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
        if (this.calculatedPermissions[channelId]) {
            return this.calculatedPermissions[channelId];
        }

        const canViewChannel = Vencord.Webpack.Common.PermissionStore.can(0x400n, Vencord.Webpack.Common.ChannelStore.getChannel(channelId));

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

                    // Mark it as deleted as we don't got permission to delete it, and don't want to keep trying again
                    // If we stop and restart the script
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
     * Starts the deletion process
     * @param map - The map of channels to delete messages from
     */
    public async startDeletion(map: ChannelMap): Promise<void> {
        if (this.isRunning) {
            addLogEntry("Deletion process is already running", "WARN");
            return;
        }
        
        this.isRunning = true;

        const permissions = this.calculatePermissions(map);
        
        for (const [channelId, canAccess] of Object.entries(permissions)) {
            if (!canAccess) {
                const found = map[channelId];
                addLogEntry(`Cannot access ${found.displayName} ${found.serverName ? `in ${found.serverName}` : ""} (${channelId})`, "ERROR");
            }
        }
        
        const messageIds = Object.entries(map)
            .filter(([id]) => permissions[id])
            .flatMap(([_, channel]) => channel.messageIds);

        const messageToChannelMap = Object.entries(map).reduce((acc, [channelId, channel]) => {
            channel.messageIds.forEach(messageId => {
                acc[messageId] = channelId;
            });
            return acc;
        }, {} as Record<string, string>);
        
        const workingMap = JSON.parse(JSON.stringify(map)) as ChannelMap;
        const alreadyDeletedMessageIds = new Set(messageIds.filter(id => AppSettingsStore.instance.isMessageDeleted(id)));
        const messagesToProcess = messageIds.filter(id => !alreadyDeletedMessageIds.has(id));
        const alreadyDeletedCount = alreadyDeletedMessageIds.size;
        const remainingToDeleteCount = messagesToProcess.length;
        const stats = AppSettingsStore.instance.getDeletionStats();
        
        addLogEntry(`Found ${messageIds.length} messages total`, "INFO");
        
        if (alreadyDeletedCount > 0) {
            addLogEntry(`${alreadyDeletedCount} messages already deleted in previous sessions (skipping)`, "INFO");
        }
        
        addLogEntry(`${remainingToDeleteCount} messages will be processed for deletion`, "INFO");
        addLogEntry(`${stats.totalDeleted} messages deleted overall in previous sessions`, "INFO");

        const etaTime = remainingToDeleteCount * AppSettingsStore.instance.getInterval();

        updateStatus("Deleting messages...", 0, `${formatTime(etaTime)} remaining`);

        let completedCount = 0;
        let skippedCount = alreadyDeletedCount;
        let processedCount = 0;
        
        for (const messageId of messagesToProcess) {
            if (!this.isRunning) break;
            
            const channelId = messageToChannelMap[messageId];
            
            processedCount++;

            if (AppSettingsStore.instance.isMessageDeleted(messageId)) {
                skippedCount++;
                
                continue;
            }

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

            const remainingMessages = remainingToDeleteCount - processedCount;
            const progress = ((processedCount + alreadyDeletedCount) / messageIds.length) * 100;
            
            updateStatus(
                `Deleting messages... (${processedCount + alreadyDeletedCount}/${messageIds.length} complete, ${skippedCount} skipped)`, 
                progress,
                remainingMessages > 0 ? `${formatTime(remainingMessages * AppSettingsStore.instance.getInterval())} remaining` : "Almost done"
            );

            await wait(AppSettingsStore.instance.getInterval());
        }

        for (const messageId of alreadyDeletedMessageIds) {
            this.removeMessageFromMap(workingMap, messageId);
        }
        
        if (!this.isRunning) {
            updateStatus(`Stopped (deletion incomplete)`);
            addLogEntry("Deletion process was stopped by user", "WARN");
        } else {
            const updatedJsonContent = JSON.stringify(workingMap);
            
            AppSettingsStore.instance.setJsonContent(updatedJsonContent);
            
            const currentStats = AppSettingsStore.instance.getDeletionStats();
            
            addLogEntry(`Deletion complete. ${completedCount} messages deleted this session.`, "INFO");
            addLogEntry(`${skippedCount} messages were already deleted and skipped.`, "INFO");
            addLogEntry(`Total: ${currentStats.totalDeleted} messages deleted overall.`, "INFO");
            
            updateStatus("Deletion complete", 100);
        }
        
        this.isRunning = false;
    }
}