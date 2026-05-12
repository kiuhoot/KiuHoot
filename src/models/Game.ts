import mongoose, { Schema, models, model } from "mongoose";

export type GameStatus =
    | "lobby"
    | "question"
    | "answer_reveal"
    | "leaderboard"
    | "finished";

export type QuestionOption = {
    text: string;
};

export type Question = {
    questionText: string;
    options: QuestionOption[];
    correctOptionIndex: number;
    timeLimitSeconds: number;
    points: number;
};

export type GameDocument = {
    _id: mongoose.Types.ObjectId;
    gameCode: string;
    title: string;
    status: GameStatus;
    currentQuestionIndex: number;
    questionStartedAt?: Date | null;
    questionEndsAt?: Date | null;
    questions: Question[];
    createdAt: Date;
    updatedAt: Date;
};

const QuestionOptionSchema = new Schema<QuestionOption>(
    {
        text: {
            type: String,
            required: true,
            trim: true,
        },
    },
    { _id: false }
);

const QuestionSchema = new Schema<Question>(
    {
        questionText: {
            type: String,
            required: true,
            trim: true,
        },

        options: {
            type: [QuestionOptionSchema],
            required: true,
            validate: {
                validator: function (options: QuestionOption[]) {
                    return options.length === 4;
                },
                message: "Each question must have exactly 4 options.",
            },
        },

        correctOptionIndex: {
            type: Number,
            required: true,
            min: 0,
            max: 3,
        },

        timeLimitSeconds: {
            type: Number,
            required: true,
            default: 20,
            min: 5,
            max: 120,
        },

        points: {
            type: Number,
            required: true,
            default: 1000,
            min: 0,
        },
    },
    { _id: true }
);

const GameSchema = new Schema<GameDocument>(
    {
        gameCode: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
        },

        title: {
            type: String,
            required: true,
            trim: true,
            default: "KiuHoot Quiz",
        },

        status: {
            type: String,
            required: true,
            enum: ["lobby", "question", "answer_reveal", "leaderboard", "finished"],
            default: "lobby",
            index: true,
        },

        currentQuestionIndex: {
            type: Number,
            required: true,
            default: -1,
        },

        questionStartedAt: {
            type: Date,
            default: null,
        },

        questionEndsAt: {
            type: Date,
            default: null,
        },

        questions: {
            type: [QuestionSchema],
            required: true,
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

const Game = models.Game || model<GameDocument>("Game", GameSchema);

export default Game;