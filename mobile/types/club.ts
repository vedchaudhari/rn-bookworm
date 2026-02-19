import { IMessage } from "react-native-gifted-chat";

export interface ClubUser {
    _id: string;
    username: string;
    profileImage: string;
}

export interface Club {
    _id: string;
    name: string;
    description: string;
    image: string;
    memberCount: number;
    tags: string[];
    createdBy: ClubUser;
    isPrivate: boolean;
}

export interface IClubMessage extends IMessage {
    clubId?: string;
    readBy?: { user: string | { _id: string }; readAt: string }[];
    deliveredTo?: { user: string | { _id: string }; deliveredAt: string }[];
    conversationId?: string;
    video?: string;
    videoThumbnail?: string;
}
