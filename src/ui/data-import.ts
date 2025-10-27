/**
 * Data Import Status Generation
 */

import type { ChannelMap } from '../types/misc';
import { AppSettingsStore } from '../utils/stores';
import { formatTime } from '../utils/formatTime';
import { formatChannelType } from './validation';

export interface ImportStatusInfo {
    channelListHtml: string;
    totalMessagesLineHtml: string;
    etaString: string;
    totalMessages: number;
}

/**
 * Generate import status information from a ChannelMap
 */
export const generateImportStatus = (channelMap: ChannelMap, intervalMs: number): ImportStatusInfo => {
    const channelTypeCounts: { [key: string]: number } = {};
    let totalMessages = 0;

    for (const channelId in channelMap) {
        if (Object.prototype.hasOwnProperty.call(channelMap, channelId)) {
            const channel = channelMap[channelId];
            const messageCount = channel.messageIds.length;
            totalMessages += messageCount;
            channelTypeCounts[channel.channelType] = (channelTypeCounts[channel.channelType] || 0) + messageCount;
        }
    }

    const deletionStats = AppSettingsStore.instance.getDeletionStats();
    let channelListHtml = "";
    
    if (Object.keys(channelTypeCounts).length > 0) {
        channelListHtml += "Messages Pending Deletion<br><ul>";
        for (const type in channelTypeCounts) {
            const formattedType = formatChannelType(type);
            channelListHtml += `<li>${formattedType}: ${channelTypeCounts[type]}</li>`;
        }
        channelListHtml += "</ul>";
    } else {
        channelListHtml = "No messages found in the imported channels.<br>";
    }
    
    if (deletionStats.totalDeleted > 0) {
        channelListHtml += "Previously Deleted Messages<br><ul>";
        for (const type in deletionStats.deletedByChannelType) {
            const formattedType = formatChannelType(type);
            channelListHtml += `<li>${formattedType}: ${deletionStats.deletedByChannelType[type]}</li>`;
        }
        channelListHtml += `</ul><p>Total Messages Deleted: ${deletionStats.totalDeleted}</p>`;
    }
    
    const totalMessagesLineHtml = `<p>Total Messages to delete: ${totalMessages}</p>`;
    const totalTimeMs = totalMessages * intervalMs;
    const etaString = formatTime(totalTimeMs);

    return { channelListHtml, totalMessagesLineHtml, etaString, totalMessages };
}

