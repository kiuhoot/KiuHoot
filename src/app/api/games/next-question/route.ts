import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Game from "@/models/Game";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
    try {
        await connectDB();

        const body = await request.json().catch(() => ({}));

        if (!isRecord(body)) {
            return NextResponse.json(
                { success: false, message: "Invalid request body." },
                { status: 400 }
            );
        }

        const gameCode =
            typeof body.gameCode === "string" ? body.gameCode.trim() : "";

        if (!gameCode) {
            return NextResponse.json(
                { success: false, message: "Game code is required." },
                { status: 400 }
            );
        }

        const game = await Game.findOne({ gameCode });

        if (!game) {
            return NextResponse.json(
                { success: false, message: "Game not found." },
                { status: 404 }
            );
        }

        if (
            game.status !== "answer_reveal" &&
            game.status !== "leaderboard" &&
            game.status !== "question"
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Cannot move to next question right now.",
                },
                { status: 400 }
            );
        }

        const nextQuestionIndex = game.currentQuestionIndex + 1;

        if (nextQuestionIndex >= game.questions.length) {
            game.status = "finished";
            game.questionStartedAt = null;
            game.questionEndsAt = null;
            await game.save();

            return NextResponse.json({
                success: true,
                finished: true,
                game: {
                    gameCode: game.gameCode,
                    status: game.status,
                    currentQuestionIndex: game.currentQuestionIndex,
                },
            });
        }

        const nextQuestion = game.questions[nextQuestionIndex];
        const now = new Date();

        game.status = "question";
        game.currentQuestionIndex = nextQuestionIndex;
        game.questionStartedAt = now;
        game.questionEndsAt = new Date(
            now.getTime() + nextQuestion.timeLimitSeconds * 1000
        );

        await game.save();

        return NextResponse.json({
            success: true,
            finished: false,
            game: {
                gameCode: game.gameCode,
                status: game.status,
                currentQuestionIndex: game.currentQuestionIndex,
                questionStartedAt: game.questionStartedAt?.toISOString() ?? null,
                questionEndsAt: game.questionEndsAt?.toISOString() ?? null,
            },
        });
    } catch (error) {
        console.error("NEXT_QUESTION_ERROR", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to move to next question.",
            },
            { status: 500 }
        );
    }
}