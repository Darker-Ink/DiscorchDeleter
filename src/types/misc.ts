export interface Channel {
    messageIds: string[];
    displayName: string;
    serverName?: string;
    channelType: string;
};

export interface ChannelMap {
    [key: string]: Channel;
}