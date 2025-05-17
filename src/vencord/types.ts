export interface RestAPIResponse {
    body: Record<string, unknown>;
    headers: Record<string, string>;
    status: number;
    ok: boolean;
    text: string;
}

export interface RestAPIType {
    del: (path: string) => Promise<RestAPIResponse>;
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