import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Game from "@/models/Game";
import Player from "@/models/Player";
import Answer from "@/models/Answer";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
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

        if (!isRecord(body)) {
            return NextResponse.json(
                { success: false, message: "Invalid request body." },
                { status: 400 }
            );
        }

        const gameCode =
            typeof body.gameCode === "string" ? body.gameCode.trim() : "";

        const playerToken =
            typeof body.playerToken === "string" ? body.playerToken.trim() : "";

        const selectedOptionIndex = Number(body.selectedOptionIndex);

        if (!gameCode) {
            return NextResponse.json(
                { success: false, message: "Game code is required." },
                { status: 400 }
            );
        }

        if (!playerToken) {
            return NextResponse.json(
                { success: false, message: "Player token is required." },
                { status: 400 }
            );
        }

        if (
            !Number.isInteger(selectedOptionIndex) ||
            selectedOptionIndex < 0 ||
            selectedOptionIndex > 3
        ) {
            return NextResponse.json(
                { success: false, message: "Invalid answer option." },
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
                    message: "This game is not accepting answers right now.",
                },
                { status: 400 }
            );
        }

        if (game.currentQuestionIndex < 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: "No active question.",
                },
                { status: 400 }
            );
        }

        const currentQuestion = game.questions[game.currentQuestionIndex];

        if (!currentQuestion) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Current question not found.",
                },
                { status: 400 }
            );
        }

        const player = await Player.findOne({
            gameId: game._id,
            playerToken,
        });

        if (!player) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Player not found.",
                },
                { status: 404 }
            );
        }

        const now = new Date();

        if (game.questionEndsAt && now.getTime() > game.questionEndsAt.getTime()) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Time is over.",
                },
                { status: 400 }
            );
        }

        const questionStartedAt = game.questionStartedAt ?? now;
        const responseTimeMs = Math.max(
            0,
            now.getTime() - questionStartedAt.getTime()
        );

        const questionDurationMs = currentQuestion.timeLimitSeconds * 1000;

        const timeLeftRatio = Math.max(
            0,
            Math.min(1, (questionDurationMs - responseTimeMs) / questionDurationMs)
        );

        const isCorrect =
            selectedOptionIndex === currentQuestion.correctOptionIndex;

        const pointsEarned = isCorrect
            ? Math.round(currentQuestion.points * (0.5 + timeLeftRatio * 0.5))
            : 0;

        try {
            await Answer.create({
                gameId: game._id,
                gameCode: game.gameCode,
                playerId: player._id,
                questionIndex: game.currentQuestionIndex,
                selectedOptionIndex,
                isCorrect,
                pointsEarned,
                responseTimeMs,
                answeredAt: now,
            });

            player.score += pointsEarned;
            player.lastSeenAt = now;
            await player.save();

            return NextResponse.json({
                success: true,
                alreadyAnswered: false,
                answer: {
                    selectedOptionIndex,
                    responseTimeMs,
                },
            });
        } catch (error) {
            if (isDuplicateKeyError(error)) {
                return NextResponse.json({
                    success: true,
                    alreadyAnswered: true,
                    message: "Player already answered this question.",
                });
            }

            throw error;
        }
    } catch (error) {
        console.error("SUBMIT_ANSWER_ERROR", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to submit answer.",
            },
            { status: 500 }
        );
    }
}