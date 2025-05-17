export interface MessageStoreType {
    deleteMessage: (channelId: string, messageId: string) => Promise<void>;
}

interface Channel {
    id: string;
}

export interface ChannelStoreType {
    getChannel: (channelId: string) => Channel;
}

export interface PermissionStoreType {
    can: (permission: bigint, channel: Channel) => boolean;
}