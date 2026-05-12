import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Game from "@/models/Game";
import Player from "@/models/Player";
import Answer from "@/models/Answer";

export const runtime = "nodejs";

const REVEAL_DURATION_MS = 5500;
const LEADERBOARD_DURATION_MS = 6500;

type SafeQuestionOption = {
    text: string;
};

async function autoAdvanceGame(game: any) {
    const now = new Date();
    const nowMs = now.getTime();

    if (
        game.status === "question" &&
        game.questionEndsAt &&
        nowMs >= game.questionEndsAt.getTime()
    ) {
        game.status = "answer_reveal";
        await game.save();
        return;
    }

    if (game.status === "answer_reveal") {
        const revealStartedAt = game.updatedAt
            ? new Date(game.updatedAt).getTime()
            : nowMs;

        if (nowMs - revealStartedAt >= REVEAL_DURATION_MS) {
            game.status = "leaderboard";
            await game.save();
            return;
        }
    }

    if (game.status === "leaderboard") {
        const leaderboardStartedAt = game.updatedAt
            ? new Date(game.updatedAt).getTime()
            : nowMs;

        if (nowMs - leaderboardStartedAt >= LEADERBOARD_DURATION_MS) {
            const nextQuestionIndex = game.currentQuestionIndex + 1;

            if (nextQuestionIndex >= game.questions.length) {
                game.status = "finished";
                game.questionStartedAt = null;
                game.questionEndsAt = null;
                await game.save();
                return;
            }

            const nextQuestion = game.questions[nextQuestionIndex];

            game.status = "question";
            game.currentQuestionIndex = nextQuestionIndex;
            game.questionStartedAt = now;
            game.questionEndsAt = new Date(
                nowMs + nextQuestion.timeLimitSeconds * 1000
            );

            await game.save();
        }
    }
}

function getPhaseAutoAdvanceAt(game: any) {
    if (!game.updatedAt) return null;

    const updatedAtMs = new Date(game.updatedAt).getTime();

    if (game.status === "answer_reveal") {
        return new Date(updatedAtMs + REVEAL_DURATION_MS).toISOString();
    }

    if (game.status === "leaderboard") {
        return new Date(updatedAtMs + LEADERBOARD_DURATION_MS).toISOString();
    }

    return null;
}

export async function GET(request: Request) {
    try {
        await connectDB();

        const url = new URL(request.url);

        const gameCode = url.searchParams.get("gameCode")?.trim() || "";
        const playerToken = url.searchParams.get("playerToken")?.trim() || "";

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

        await autoAdvanceGame(game);

        const players = await Player.find({ gameId: game._id }).sort({
            score: -1,
            joinedAt: 1,
        });

        const player = playerToken
            ? await Player.findOne({
                gameId: game._id,
                playerToken,
            })
            : null;

        if (player) {
            player.lastSeenAt = new Date();
            await player.save();
        }

        const currentQuestion =
            game.currentQuestionIndex >= 0
                ? game.questions[game.currentQuestionIndex]
                : null;

        const shouldRevealCorrectAnswer =
            game.status === "answer_reveal" ||
            game.status === "leaderboard" ||
            game.status === "finished";

        const myAnswer =
            player && game.currentQuestionIndex >= 0
                ? await Answer.findOne({
                    gameId: game._id,
                    playerId: player._id,
                    questionIndex: game.currentQuestionIndex,
                })
                : null;

        const answerCount =
            game.currentQuestionIndex >= 0
                ? await Answer.countDocuments({
                    gameId: game._id,
                    questionIndex: game.currentQuestionIndex,
                })
                : 0;

        return NextResponse.json({
            success: true,
            serverTime: new Date().toISOString(),

            game: {
                id: String(game._id),
                gameCode: game.gameCode,
                title: game.title,
                status: game.status,
                currentQuestionIndex: game.currentQuestionIndex,
                questionsCount: game.questions.length,
                questionStartedAt: game.questionStartedAt
                    ? game.questionStartedAt.toISOString()
                    : null,
                questionEndsAt: game.questionEndsAt
                    ? game.questionEndsAt.toISOString()
                    : null,
                phaseAutoAdvanceAt: getPhaseAutoAdvanceAt(game),
            },

            currentQuestion: currentQuestion
                ? {
                    index: game.currentQuestionIndex,
                    questionText: currentQuestion.questionText,
                    options: currentQuestion.options.map(
                        (option: SafeQuestionOption, index: number) => ({
                            index,
                            text: option.text,
                        })
                    ),
                    timeLimitSeconds: currentQuestion.timeLimitSeconds,
                    points: currentQuestion.points,
                    correctOptionIndex: shouldRevealCorrectAnswer
                        ? currentQuestion.correctOptionIndex
                        : null,
                }
                : null,

            player: player
                ? {
                    id: String(player._id),
                    nickname: player.nickname,
                    score: player.score,
                }
                : null,

            myAnswer: myAnswer
                ? {
                    selectedOptionIndex: myAnswer.selectedOptionIndex,
                    isCorrect: shouldRevealCorrectAnswer ? myAnswer.isCorrect : null,
                    pointsEarned: shouldRevealCorrectAnswer
                        ? myAnswer.pointsEarned
                        : null,
                    responseTimeMs: myAnswer.responseTimeMs,
                }
                : null,

            answerCount,

            players: players.map((item) => ({
                id: String(item._id),
                nickname: item.nickname,
                score: item.score,
            })),

            leaderboard: players.map((item, index: number) => ({
                rank: index + 1,
                id: String(item._id),
                nickname: item.nickname,
                score: item.score,
            })),
        });
    } catch (error) {
        console.error("GAME_STATE_ERROR", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to load game state.",
            },
            { status: 500 }
        );
    }
}