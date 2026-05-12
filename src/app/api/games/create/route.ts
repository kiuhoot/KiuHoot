import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Game, { Question } from "@/models/Game";

export const runtime = "nodejs";

const DEFAULT_QUESTIONS: Question[] = [
    {
        questionText: "When did Georgia declare independence from the Russian Empire?",
        options: [
            { text: "May 26, 1918" },
            { text: "April 9, 1991" },
            { text: "May 12, 1921" },
            { text: "November 23, 2003" },
        ],
        correctOptionIndex: 0,
        timeLimitSeconds: 20,
        points: 1000,
    },
    {
        questionText: "Which day is celebrated as Georgia's Independence Day?",
        options: [
            { text: "April 9" },
            { text: "May 26" },
            { text: "August 8" },
            { text: "January 1" },
        ],
        correctOptionIndex: 1,
        timeLimitSeconds: 20,
        points: 1000,
    },
    {
        questionText: "What was the name of the first independent Georgian republic?",
        options: [
            { text: "Kingdom of Georgia" },
            { text: "Democratic Republic of Georgia" },
            { text: "Georgian Soviet Republic" },
            { text: "Republic of Tbilisi" },
        ],
        correctOptionIndex: 1,
        timeLimitSeconds: 25,
        points: 1000,
    },
];

function generateGameCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function normalizeQuestions(input: unknown): Question[] {
    if (!Array.isArray(input)) {
        return DEFAULT_QUESTIONS;
    }

    const questions: Question[] = [];

    for (const item of input) {
        if (!isRecord(item)) continue;

        const questionText =
            typeof item.questionText === "string" ? item.questionText.trim() : "";

        const rawOptions = Array.isArray(item.options) ? item.options : [];

        const options = rawOptions
            .map((option) => {
                if (typeof option === "string") {
                    return { text: option.trim() };
                }

                if (isRecord(option) && typeof option.text === "string") {
                    return { text: option.text.trim() };
                }

                return null;
            })
            .filter((option): option is { text: string } => {
                return option !== null && option.text.length > 0;
            });

        const correctOptionIndex = Number(item.correctOptionIndex);
        const timeLimitSeconds = Number(item.timeLimitSeconds ?? 20);
        const points = Number(item.points ?? 1000);

        if (!questionText) continue;
        if (options.length !== 4) continue;
        if (!Number.isInteger(correctOptionIndex)) continue;
        if (correctOptionIndex < 0 || correctOptionIndex > 3) continue;

        questions.push({
            questionText,
            options,
            correctOptionIndex,
            timeLimitSeconds:
                Number.isFinite(timeLimitSeconds) && timeLimitSeconds >= 5
                    ? timeLimitSeconds
                    : 20,
            points: Number.isFinite(points) && points >= 0 ? points : 1000,
        });
    }

    return questions.length > 0 ? questions : DEFAULT_QUESTIONS;
}

function isDuplicateKeyError(error: unknown) {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: number }).code === 11000
    );
}

export async function POST(request: Request) {
    try {
        await connectDB();

        const body = await request.json().catch(() => ({}));

        const title =
            isRecord(body) && typeof body.title === "string" && body.title.trim()
                ? body.title.trim()
                : "საქართველოს დამოუკიდებლობის დღის ვიქტორინა";

        const questions =
            isRecord(body) && "questions" in body
                ? normalizeQuestions(body.questions)
                : DEFAULT_QUESTIONS;

        for (let attempt = 0; attempt < 10; attempt++) {
            const gameCode = generateGameCode();

            try {
                const game = await Game.create({
                    gameCode,
                    title,
                    status: "lobby",
                    currentQuestionIndex: -1,
                    questionStartedAt: null,
                    questionEndsAt: null,
                    questions,
                });

                return NextResponse.json({
                    success: true,
                    game: {
                        id: String(game._id),
                        gameCode: game.gameCode,
                        title: game.title,
                        status: game.status,
                        questionsCount: game.questions.length,
                    },
                    links: {
                        host: `/host/${game.gameCode}`,
                        play: `/play/${game.gameCode}`,
                    },
                });
            } catch (error) {
                if (isDuplicateKeyError(error)) {
                    continue;
                }

                throw error;
            }
        }

        return NextResponse.json(
            {
                success: false,
                message: "Could not generate unique game code.",
            },
            { status: 500 }
        );
    } catch (error) {
        console.error("CREATE_GAME_ERROR", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to create game.",
            },
            { status: 500 }
        );
    }
}