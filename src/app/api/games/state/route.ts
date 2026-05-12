import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Game from "@/models/Game";
import Player from "@/models/Player";
import Answer from "@/models/Answer";

export const runtime = "nodejs";

type SafeQuestionOption = {
    text: string;
};

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