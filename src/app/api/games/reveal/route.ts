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

        if (game.status !== "question") {
            return NextResponse.json(
                {
                    success: false,
                    message: "Only active question can be revealed.",
                },
                { status: 400 }
            );
        }

        game.status = "answer_reveal";
        await game.save();

        return NextResponse.json({
            success: true,
            game: {
                gameCode: game.gameCode,
                status: game.status,
                currentQuestionIndex: game.currentQuestionIndex,
            },
        });
    } catch (error) {
        console.error("REVEAL_ANSWER_ERROR", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to reveal answer.",
            },
            { status: 500 }
        );
    }
}