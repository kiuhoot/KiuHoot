import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Game from "@/models/Game";
import Player from "@/models/Player";

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

        const nickname =
            typeof body.nickname === "string" ? body.nickname.trim() : "";

        let playerToken =
            typeof body.playerToken === "string" ? body.playerToken.trim() : "";

        if (!gameCode) {
            return NextResponse.json(
                { success: false, message: "Game code is required." },
                { status: 400 }
            );
        }

        if (!nickname) {
            return NextResponse.json(
                { success: false, message: "Nickname is required." },
                { status: 400 }
            );
        }

        if (nickname.length > 30) {
            return NextResponse.json(
                { success: false, message: "Nickname is too long." },
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

        if (!playerToken) {
            playerToken = randomUUID();
        }

        const existingPlayer = await Player.findOne({
            gameId: game._id,
            playerToken,
        });

        if (existingPlayer) {
            existingPlayer.nickname = nickname;
            existingPlayer.lastSeenAt = new Date();
            await existingPlayer.save();

            return NextResponse.json({
                success: true,
                playerToken,
                player: {
                    id: String(existingPlayer._id),
                    nickname: existingPlayer.nickname,
                    score: existingPlayer.score,
                },
                game: {
                    gameCode: game.gameCode,
                    status: game.status,
                },
            });
        }

        if (game.status !== "lobby") {
            return NextResponse.json(
                {
                    success: false,
                    message: "This game has already started.",
                },
                { status: 403 }
            );
        }

        const player = await Player.create({
            gameId: game._id,
            gameCode: game.gameCode,
            nickname,
            playerToken,
            score: 0,
            lastSeenAt: new Date(),
            joinedAt: new Date(),
        });

        return NextResponse.json({
            success: true,
            playerToken,
            player: {
                id: String(player._id),
                nickname: player.nickname,
                score: player.score,
            },
            game: {
                gameCode: game.gameCode,
                status: game.status,
            },
        });
    } catch (error) {
        console.error("JOIN_GAME_ERROR", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to join game.",
            },
            { status: 500 }
        );
    }
}