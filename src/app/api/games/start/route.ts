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

        if (game.status !== "lobby") {
            return NextResponse.json(
                {
                    success: false,
                    message: "Game can only be started from lobby.",
                },
                { status: 400 }
            );
        }

        if (game.questions.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Game has no questions.",
                },
                { status: 400 }
            );
        }

        const firstQuestion = game.questions[0];
        const now = new Date();

        game.status = "question";
        game.currentQuestionIndex = 0;
        game.questionStartedAt = now;
        game.questionEndsAt = new Date(
            now.getTime() + firstQuestion.timeLimitSeconds * 1000
        );

        await game.save();

        return NextResponse.json({
            success: true,
            game: {
                gameCode: game.gameCode,
                status: game.status,
                currentQuestionIndex: game.currentQuestionIndex,
                questionStartedAt: game.questionStartedAt?.toISOString() ?? null,
                questionEndsAt: game.questionEndsAt?.toISOString() ?? null,
            },
        });
    } catch (error) {
        console.error("START_GAME_ERROR", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to start game.",
            },
            { status: 500 }
        );
    }
}