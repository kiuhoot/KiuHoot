import mongoose, { Schema, models, model } from "mongoose";

export type PlayerDocument = {
    _id: mongoose.Types.ObjectId;
    gameId: mongoose.Types.ObjectId;
    gameCode: string;
    nickname: string;
    playerToken: string;
    score: number;
    lastSeenAt: Date;
    joinedAt: Date;
    createdAt: Date;
    updatedAt: Date;
};

const PlayerSchema = new Schema<PlayerDocument>(
    {
        gameId: {
            type: Schema.Types.ObjectId,
            ref: "Game",
            required: true,
            index: true,
        },

        gameCode: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },

        nickname: {
            type: String,
            required: true,
            trim: true,
            minlength: 1,
            maxlength: 30,
        },

        playerToken: {
            type: String,
            required: true,
            trim: true,
        },

        score: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },

        lastSeenAt: {
            type: Date,
            required: true,
            default: Date.now,
        },

        joinedAt: {
            type: Date,
            required: true,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

PlayerSchema.index({ gameId: 1, playerToken: 1 }, { unique: true });
PlayerSchema.index({ gameId: 1, score: -1 });

const Player = models.Player || model<PlayerDocument>("Player", PlayerSchema);

export default Player;