"use client";

import { QRCodeSVG } from "qrcode.react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type GameStatus =
    | "lobby"
    | "question"
    | "answer_reveal"
    | "leaderboard"
    | "finished";

type GameState = {
    success: boolean;
    message?: string;
    serverTime: string;
    game: {
        gameCode: string;
        title: string;
        status: GameStatus;
        currentQuestionIndex: number;
        questionsCount: number;
        questionStartedAt: string | null;
        questionEndsAt: string | null;
    };
    currentQuestion: {
        index: number;
        questionText: string;
        options: {
            index: number;
            text: string;
        }[];
        timeLimitSeconds: number;
        points: number;
        correctOptionIndex: number | null;
    } | null;
    answerCount: number;
    players: {
        id: string;
        nickname: string;
        score: number;
    }[];
    leaderboard: {
        rank: number;
        id: string;
        nickname: string;
        score: number;
    }[];
};

export default function HostGamePage() {
    const params = useParams<{ gameCode: string }>();
    const gameCode = params.gameCode;

    const [state, setState] = useState<GameState | null>(null);
    const [error, setError] = useState("");
    const [actionLoading, setActionLoading] = useState("");
    const [now, setNow] = useState(Date.now());

    const playUrl = useMemo(() => {
        if (typeof window === "undefined") return "";
        return `${window.location.origin}/play/${gameCode}`;
    }, [gameCode]);

    async function loadState() {
        try {
            const response = await fetch(`/api/games/state?gameCode=${gameCode}`, {
                cache: "no-store",
            });

            const data = (await response.json()) as GameState;

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to load game state.");
            }

            setState(data);
            setError("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load state.");
        }
    }

    async function hostAction(endpoint: string) {
        try {
            setActionLoading(endpoint);
            setError("");

            const response = await fetch(`/api/games/${endpoint}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ gameCode }),
            });

            const data = (await response.json()) as {
                success: boolean;
                message?: string;
            };

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Action failed.");
            }

            await loadState();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Action failed.");
        } finally {
            setActionLoading("");
        }
    }

    useEffect(() => {
        void loadState();

        const polling = window.setInterval(() => {
            void loadState();
        }, 700);

        const clock = window.setInterval(() => {
            setNow(Date.now());
        }, 200);

        return () => {
            window.clearInterval(polling);
            window.clearInterval(clock);
        };
    }, [gameCode]);

    const secondsLeft = useMemo(() => {
        if (!state?.game.questionEndsAt) return 0;

        const end = new Date(state.game.questionEndsAt).getTime();
        return Math.max(0, Math.ceil((end - now) / 1000));
    }, [state?.game.questionEndsAt, now]);

    const status = state?.game.status;

    const isGameScreen =
        status === "question" ||
        status === "answer_reveal" ||
        status === "leaderboard" ||
        status === "finished";

    return (
        <main className="min-h-screen overflow-hidden bg-[#fff7f7] text-[#111111]">
            <section
                className={
                    isGameScreen
                        ? "mx-auto min-h-screen max-w-7xl px-6 py-5"
                        : "mx-auto grid min-h-screen max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[1fr_380px]"
                }
            >
                <div
                    className={
                        isGameScreen
                            ? "min-h-[calc(100vh-40px)] rounded-[2rem] border border-red-100 bg-white p-7 shadow-xl shadow-red-100"
                            : "rounded-[2rem] border border-red-100 bg-white p-8 shadow-xl shadow-red-100"
                    }
                >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.35em] text-red-600">
                                Host Screen
                            </p>
                            <h1
                                className={
                                    isGameScreen
                                        ? "mt-1 text-2xl font-black tracking-tight md:text-4xl"
                                        : "mt-2 text-3xl font-black md:text-5xl"
                                }
                            >
                                {state?.game.title || "Loading..."}
                            </h1>
                        </div>

                        <div className="rounded-2xl bg-red-600 px-5 py-3 text-center text-white shadow-lg shadow-red-200">
                            <p className="text-[10px] font-bold uppercase tracking-widest">
                                Game Code
                            </p>
                            <p className="text-2xl font-black tracking-wider">{gameCode}</p>
                        </div>
                    </div>

                    {error ? (
                        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-semibold text-red-700">
                            {error}
                        </div>
                    ) : null}

                    {!state ? (
                        <div className="mt-10 text-xl font-bold text-gray-500">
                            Loading game...
                        </div>
                    ) : null}

                    {state && status === "lobby" ? (
                        <div className="mt-10 grid gap-8 lg:grid-cols-[320px_1fr]">
                            <div className="rounded-[2rem] border border-gray-200 bg-gray-50 p-6 text-center">
                                {playUrl ? (
                                    <div className="rounded-3xl bg-white p-4">
                                        <QRCodeSVG value={playUrl} size={260} />
                                    </div>
                                ) : null}

                                <p className="mt-5 break-all text-sm font-semibold text-gray-600">
                                    {playUrl}
                                </p>
                            </div>

                            <div>
                                <h2 className="text-3xl font-black">Waiting for players</h2>
                                <p className="mt-2 text-lg text-gray-600">
                                    Players joined:{" "}
                                    <span className="font-black text-red-600">
                    {state.players.length}
                  </span>
                                </p>

                                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                                    {state.players.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-gray-500">
                                            No players yet.
                                        </div>
                                    ) : (
                                        state.players.map((player) => (
                                            <div
                                                key={player.id}
                                                className="rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4 font-bold"
                                            >
                                                {player.nickname}
                                            </div>
                                        ))
                                    )}
                                </div>

                                <button
                                    onClick={() => hostAction("start")}
                                    disabled={Boolean(actionLoading)}
                                    className="mt-8 rounded-2xl bg-red-600 px-8 py-4 text-lg font-black text-white shadow-lg shadow-red-200 transition hover:scale-[1.02] hover:bg-red-700 disabled:opacity-60"
                                >
                                    {actionLoading === "start" ? "Starting..." : "Start Game"}
                                </button>
                            </div>
                        </div>
                    ) : null}

                    {state && status === "question" && state.currentQuestion ? (
                        <div className="flex min-h-[calc(100vh-180px)] flex-col justify-between pt-7">
                            <div className="animate-[fadeIn_0.35s_ease-out]">
                                <div className="flex items-start justify-between gap-6">
                                    <div className="max-w-5xl">
                                        <p className="text-base font-black text-red-600 md:text-lg">
                                            Question {state.currentQuestion.index + 1} /{" "}
                                            {state.game.questionsCount}
                                        </p>

                                        <h2 className="mt-4 text-[clamp(2.4rem,5vw,5.6rem)] font-black leading-[1.05] tracking-tight">
                                            {state.currentQuestion.questionText}
                                        </h2>
                                    </div>

                                    <div
                                        className={
                                            secondsLeft <= 5
                                                ? "animate-pulse rounded-full bg-red-600 px-8 py-6 text-center text-white shadow-xl shadow-red-200"
                                                : "rounded-full bg-red-600 px-8 py-6 text-center text-white shadow-xl shadow-red-200"
                                        }
                                    >
                                        <p className="text-xs font-bold uppercase tracking-widest">
                                            Time
                                        </p>
                                        <p className="text-5xl font-black">{secondsLeft}</p>
                                    </div>
                                </div>

                                <div className="mt-5 h-4 overflow-hidden rounded-full bg-gray-100">
                                    <div
                                        className="h-full rounded-full bg-red-600 transition-all duration-200"
                                        style={{
                                            width: `${
                                                state.currentQuestion.timeLimitSeconds > 0
                                                    ? (secondsLeft /
                                                        state.currentQuestion.timeLimitSeconds) *
                                                    100
                                                    : 0
                                            }%`,
                                        }}
                                    />
                                </div>

                                <p className="mt-4 text-lg font-bold text-gray-600">
                                    Answers submitted:{" "}
                                    <span className="text-red-600">{state.answerCount}</span> /{" "}
                                    {state.players.length}
                                </p>
                            </div>

                            <div className="mt-8 grid gap-4 md:grid-cols-2">
                                {state.currentQuestion.options.map((option) => (
                                    <div
                                        key={option.index}
                                        className="animate-[popIn_0.3s_ease-out] rounded-[1.5rem] border border-gray-200 bg-gray-50 p-6 text-[clamp(1.2rem,2.1vw,2rem)] font-black shadow-sm"
                                    >
                    <span className="mr-4 text-red-600">
                      {String.fromCharCode(65 + option.index)}
                    </span>
                                        {option.text}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {state && status === "answer_reveal" && state.currentQuestion ? (
                        <div className="flex min-h-[calc(100vh-180px)] flex-col justify-between pt-7">
                            <div className="animate-[popIn_0.35s_ease-out]">
                                <p className="text-lg font-black text-red-600">
                                    Time is over — correct answer
                                </p>

                                <h2 className="mt-4 text-[clamp(2.5rem,5vw,5.8rem)] font-black leading-tight">
                                    {
                                        state.currentQuestion.options[
                                        state.currentQuestion.correctOptionIndex ?? 0
                                            ]?.text
                                    }
                                </h2>
                            </div>

                            <div className="mt-8 grid gap-4 md:grid-cols-2">
                                {state.currentQuestion.options.map((option) => {
                                    const isCorrect =
                                        option.index === state.currentQuestion?.correctOptionIndex;

                                    return (
                                        <div
                                            key={option.index}
                                            className={`rounded-[1.5rem] border p-6 text-[clamp(1.2rem,2.1vw,2rem)] font-black transition-all duration-500 ${
                                                isCorrect
                                                    ? "scale-[1.02] border-green-300 bg-green-50 text-green-800 shadow-xl shadow-green-100"
                                                    : "border-gray-200 bg-gray-50 text-gray-400"
                                            }`}
                                        >
                      <span className="mr-4">
                        {String.fromCharCode(65 + option.index)}
                      </span>
                                            {option.text}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-8 flex justify-end gap-3">
                                <button
                                    onClick={() => hostAction("show-leaderboard")}
                                    disabled={Boolean(actionLoading)}
                                    className="rounded-2xl bg-red-600 px-8 py-4 text-lg font-black text-white shadow-lg shadow-red-200 transition hover:scale-[1.02] hover:bg-red-700 disabled:opacity-60"
                                >
                                    Show Leaderboard
                                </button>

                                <button
                                    onClick={() => hostAction("next-question")}
                                    disabled={Boolean(actionLoading)}
                                    className="rounded-2xl bg-black px-8 py-4 text-lg font-black text-white transition hover:scale-[1.02] hover:bg-gray-800 disabled:opacity-60"
                                >
                                    Next Question
                                </button>
                            </div>
                        </div>
                    ) : null}

                    {state && status === "leaderboard" ? (
                        <div className="pt-7">
                            <p className="text-lg font-black text-red-600">Leaderboard</p>
                            <h2 className="mt-3 text-[clamp(3rem,6vw,6.5rem)] font-black leading-none">
                                Current Ranking
                            </h2>

                            <div className="mt-8 grid gap-3">
                                {state.leaderboard.slice(0, 8).map((player) => (
                                    <div
                                        key={player.id}
                                        className="animate-[slideUp_0.35s_ease-out] flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-6 py-4 shadow-sm"
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-xl font-black text-white">
                                                {player.rank}
                                            </div>
                                            <p className="text-2xl font-black">{player.nickname}</p>
                                        </div>

                                        <p className="text-2xl font-black text-red-600">
                                            {player.score}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => hostAction("next-question")}
                                disabled={Boolean(actionLoading)}
                                className="mt-8 rounded-2xl bg-red-600 px-8 py-4 text-lg font-black text-white shadow-lg shadow-red-200 transition hover:scale-[1.02] hover:bg-red-700 disabled:opacity-60"
                            >
                                Next Question / Finish
                            </button>
                        </div>
                    ) : null}

                    {state && status === "finished" ? (
                        <div className="relative flex min-h-[calc(100vh-160px)] flex-col items-center justify-center overflow-hidden text-center">
                            <div className="pointer-events-none absolute inset-0">
                                <div className="absolute left-[15%] top-[20%] h-6 w-6 animate-bounce rounded-full bg-red-500" />
                                <div className="absolute left-[75%] top-[18%] h-5 w-5 animate-pulse rounded-full bg-yellow-400" />
                                <div className="absolute left-[25%] top-[75%] h-4 w-4 animate-bounce rounded-full bg-green-500" />
                                <div className="absolute left-[82%] top-[70%] h-7 w-7 animate-pulse rounded-full bg-red-400" />
                            </div>

                            <div className="animate-[popIn_0.45s_ease-out]">
                                <p className="text-lg font-black uppercase tracking-[0.3em] text-red-600">
                                    Game Finished
                                </p>

                                <h2 className="mt-5 text-[clamp(4rem,9vw,9rem)] font-black leading-none">
                                    Winner
                                </h2>

                                {state.leaderboard[0] ? (
                                    <div className="mx-auto mt-10 max-w-2xl rounded-[2rem] border border-yellow-200 bg-yellow-50 p-10 shadow-2xl shadow-yellow-100">
                                        <p className="text-[clamp(3rem,6vw,6rem)] font-black leading-none">
                                            {state.leaderboard[0].nickname}
                                        </p>
                                        <p className="mt-6 text-4xl font-black text-red-600">
                                            {state.leaderboard[0].score} points
                                        </p>
                                    </div>
                                ) : (
                                    <p className="mt-8 text-xl font-bold text-gray-500">
                                        No players joined.
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : null}
                </div>

                {!isGameScreen ? (
                    <aside className="rounded-[2rem] border border-red-100 bg-white p-6 shadow-xl shadow-red-100">
                        <h2 className="text-2xl font-black">Players</h2>

                        <div className="mt-5 grid gap-3">
                            {state?.players.length ? (
                                state.players.map((player) => (
                                    <div
                                        key={player.id}
                                        className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3"
                                    >
                                        <span className="font-bold">{player.nickname}</span>
                                        <span className="font-black text-red-600">
                      {player.score}
                    </span>
                                    </div>
                                ))
                            ) : (
                                <p className="rounded-2xl border border-dashed border-gray-300 p-4 text-gray-500">
                                    No players yet.
                                </p>
                            )}
                        </div>
                    </aside>
                ) : null}
            </section>
        </main>
    );
}