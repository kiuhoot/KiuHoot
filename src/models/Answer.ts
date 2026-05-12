import mongoose, { Schema, models, model } from "mongoose";

export type AnswerDocument = {
    _id: mongoose.Types.ObjectId;
    gameId: mongoose.Types.ObjectId;
    gameCode: string;
    playerId: mongoose.Types.ObjectId;
    questionIndex: number;
    selectedOptionIndex: number;
    isCorrect: boolean;
    pointsEarned: number;
    responseTimeMs: number;
    answeredAt: Date;
    createdAt: Date;
    updatedAt: Date;
};

const AnswerSchema = new Schema<AnswerDocument>(
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

        playerId: {
            type: Schema.Types.ObjectId,
            ref: "Player",
            required: true,
            index: true,
        },

        questionIndex: {
            type: Number,
            required: true,
            min: 0,
        },

        selectedOptionIndex: {
            type: Number,
            required: true,
            min: 0,
            max: 3,
        },

        isCorrect: {
            type: Boolean,
            required: true,
            default: false,
        },

        pointsEarned: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },

        responseTimeMs: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },

        answeredAt: {
            type: Date,
            required: true,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

AnswerSchema.index(
    { gameId: 1, playerId: 1, questionIndex: 1 },
    { unique: true }
);

AnswerSchema.index({ gameId: 1, questionIndex: 1 });

const Answer = models.Answer || model<AnswerDocument>("Answer", AnswerSchema);

export default Answer;