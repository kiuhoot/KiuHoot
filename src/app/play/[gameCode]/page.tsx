"use client";

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
    player: {
        id: string;
        nickname: string;
        score: number;
    } | null;
    myAnswer: {
        selectedOptionIndex: number;
        isCorrect: boolean | null;
        pointsEarned: number | null;
        responseTimeMs: number;
    } | null;
    answerCount: number;
    leaderboard: {
        rank: number;
        id: string;
        nickname: string;
        score: number;
    }[];
};

type JoinResponse = {
    success: boolean;
    message?: string;
    playerToken?: string;
};

type AnswerResponse = {
    success: boolean;
    message?: string;
    alreadyAnswered?: boolean;
};

export default function PlayGamePage() {
    const params = useParams<{ gameCode: string }>();
    const gameCode = params.gameCode;

    const storageKey = `kiuhoot-player-token-${gameCode}`;

    const [nickname, setNickname] = useState("");
    const [playerToken, setPlayerToken] = useState("");
    const [state, setState] = useState<GameState | null>(null);
    const [error, setError] = useState("");
    const [joining, setJoining] = useState(false);
    const [answering, setAnswering] = useState(false);
    const [now, setNow] = useState(Date.now());

    async function loadState(tokenOverride?: string) {
        const token = tokenOverride || playerToken;

        if (!token) return;

        try {
            const response = await fetch(
                `/api/games/state?gameCode=${gameCode}&playerToken=${token}`,
                {
                    cache: "no-store",
                }
            );

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

    async function joinGame(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        try {
            setJoining(true);
            setError("");

            const existingToken =
                window.localStorage.getItem(storageKey) || undefined;

            const response = await fetch("/api/games/join", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    gameCode,
                    nickname,
                    playerToken: existingToken,
                }),
            });

            const data = (await response.json()) as JoinResponse;

            if (!response.ok || !data.success || !data.playerToken) {
                throw new Error(data.message || "Failed to join game.");
            }

            window.localStorage.setItem(storageKey, data.playerToken);
            setPlayerToken(data.playerToken);

            await loadState(data.playerToken);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to join game.");
        } finally {
            setJoining(false);
        }
    }

    async function submitAnswer(selectedOptionIndex: number) {
        if (!playerToken || answering || state?.myAnswer) return;

        try {
            setAnswering(true);
            setError("");

            const response = await fetch("/api/games/answer", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    gameCode,
                    playerToken,
                    selectedOptionIndex,
                }),
            });

            const data = (await response.json()) as AnswerResponse;

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to submit answer.");
            }

            await loadState();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to submit answer.");
        } finally {
            setAnswering(false);
        }
    }

    useEffect(() => {
        const savedToken = window.localStorage.getItem(storageKey);

        if (savedToken) {
            setPlayerToken(savedToken);
            void loadState(savedToken);
        }
    }, [gameCode]);

    useEffect(() => {
        if (!playerToken) return;

        const polling = window.setInterval(() => {
            void loadState();
        }, 800);

        const clock = window.setInterval(() => {
            setNow(Date.now());
        }, 250);

        return () => {
            window.clearInterval(polling);
            window.clearInterval(clock);
        };
    }, [playerToken, gameCode]);

    const secondsLeft = useMemo(() => {
        if (!state?.game.questionEndsAt) return 0;

        const end = new Date(state.game.questionEndsAt).getTime();
        return Math.max(0, Math.ceil((end - now) / 1000));
    }, [state?.game.questionEndsAt, now]);

    const myRank = useMemo(() => {
        if (!state?.player) return null;
        return state.leaderboard.find((item) => item.id === state.player?.id);
    }, [state]);

    if (!playerToken || !state?.player) {
        return (
            <main className="min-h-screen bg-[#fff7f7] px-5 py-8 text-[#111111]">
                <section className="mx-auto flex min-h-[85vh] max-w-md flex-col justify-center">
                    <div className="rounded-[2rem] border border-red-100 bg-white p-7 shadow-xl shadow-red-100">
                        <p className="text-sm font-bold uppercase tracking-[0.25em] text-red-600">
                            Join Game
                        </p>

                        <h1 className="mt-3 text-4xl font-black">KiuHoot</h1>

                        <p className="mt-3 text-gray-600">
                            Game code:{" "}
                            <span className="font-black text-red-600">{gameCode}</span>
                        </p>

                        <form onSubmit={joinGame} className="mt-8">
                            <label className="text-sm font-bold text-gray-700">
                                Your nickname
                            </label>

                            <input
                                value={nickname}
                                onChange={(event) => setNickname(event.target.value)}
                                maxLength={30}
                                required
                                className="mt-3 w-full rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 text-lg font-bold outline-none transition focus:border-red-400 focus:bg-white"
                                placeholder="Enter your name"
                            />

                            {error ? (
                                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
                                    {error}
                                </div>
                            ) : null}

                            <button
                                disabled={joining}
                                className="mt-6 w-full rounded-2xl bg-red-600 px-8 py-4 text-lg font-black text-white shadow-lg shadow-red-200 transition hover:bg-red-700 disabled:opacity-60"
                            >
                                {joining ? "Joining..." : "Join Game"}
                            </button>
                        </form>
                    </div>
                </section>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#fff7f7] px-5 py-6 text-[#111111]">
            <section className="mx-auto max-w-2xl">
                <header className="mb-5 flex items-center justify-between gap-4 rounded-[1.5rem] bg-white px-5 py-4 shadow-sm">
                    <div>
                        <p className="text-sm font-bold text-gray-500">
                            {state.player.nickname}
                        </p>
                        <p className="text-xl font-black">{state.player.score} points</p>
                    </div>

                    <div className="text-right">
                        <p className="text-sm font-bold text-gray-500">Rank</p>
                        <p className="text-xl font-black text-red-600">
                            {myRank ? `#${myRank.rank}` : "-"}
                        </p>
                    </div>
                </header>

                {error ? (
                    <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
                        {error}
                    </div>
                ) : null}

                {state.game.status === "lobby" ? (
                    <div className="rounded-[2rem] bg-white p-8 text-center shadow-xl shadow-red-100">
                        <p className="text-sm font-bold uppercase tracking-[0.25em] text-red-600">
                            Waiting Room
                        </p>
                        <h1 className="mt-5 text-4xl font-black">You are in!</h1>
                        <p className="mt-4 text-lg leading-8 text-gray-600">
                            Wait for the host to start the quiz.
                        </p>
                    </div>
                ) : null}

                {state.game.status === "question" && state.currentQuestion ? (
                    <div className="rounded-[2rem] bg-white p-6 shadow-xl shadow-red-100">
                        <div className="flex items-start justify-between gap-4">
                            <p className="font-black text-red-600">
                                Question {state.currentQuestion.index + 1} /{" "}
                                {state.game.questionsCount}
                            </p>

                            <div className="rounded-full bg-red-600 px-4 py-2 font-black text-white">
                                {secondsLeft}s
                            </div>
                        </div>

                        <h1 className="mt-5 text-3xl font-black leading-tight">
                            {state.currentQuestion.questionText}
                        </h1>

                        {state.myAnswer ? (
                            <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 font-bold text-green-800">
                                Answer submitted. Wait for the result.
                            </div>
                        ) : null}

                        <div className="mt-7 grid gap-3">
                            {state.currentQuestion.options.map((option) => {
                                const optionStyles = [
                                    "bg-[#E21B3C] shadow-red-200",
                                    "bg-[#1368CE] shadow-blue-200",
                                    "bg-[#D89E00] shadow-yellow-200",
                                    "bg-[#26890C] shadow-green-200",
                                ];

                                const symbols = ["▲", "◆", "●", "■"];

                                return (
                                    <button
                                        key={option.index}
                                        onClick={() => submitAnswer(option.index)}
                                        disabled={answering || Boolean(state.myAnswer)}
                                        className={`kh-animate-pop rounded-2xl px-5 py-5 text-left text-lg font-black text-white shadow-lg transition active:scale-95 disabled:opacity-60 ${
                                            optionStyles[option.index]
                                        }`}
                                    >
                                        <span className="mr-3 text-2xl">{symbols[option.index]}</span>
                                        {option.text}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : null}

                {state.game.status === "answer_reveal" && state.currentQuestion ? (
                    <div className="rounded-[2rem] bg-white p-6 shadow-xl shadow-red-100">
                        <p className="font-black text-red-600">Result</p>

                        {state.myAnswer ? (
                            <div
                                className={`mt-5 rounded-2xl px-5 py-5 text-center font-black ${
                                    state.myAnswer.isCorrect
                                        ? "bg-green-50 text-green-800"
                                        : "bg-red-50 text-red-800"
                                }`}
                            >
                                {state.myAnswer.isCorrect ? "Correct!" : "Incorrect"}
                                <p className="mt-2 text-3xl">
                                    +{state.myAnswer.pointsEarned ?? 0}
                                </p>
                            </div>
                        ) : (
                            <div className="mt-5 rounded-2xl bg-gray-50 px-5 py-5 text-center font-black text-gray-600">
                                No answer submitted.
                            </div>
                        )}

                        <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-5">
                            <p className="text-sm font-bold text-green-700">
                                Correct answer
                            </p>
                            <p className="mt-2 text-2xl font-black text-green-900">
                                {
                                    state.currentQuestion.options[
                                    state.currentQuestion.correctOptionIndex ?? 0
                                        ]?.text
                                }
                            </p>
                        </div>
                    </div>
                ) : null}

                {state.game.status === "leaderboard" ? (
                    <div className="rounded-[2rem] bg-white p-6 shadow-xl shadow-red-100">
                        <p className="font-black text-red-600">Leaderboard</p>
                        <h1 className="mt-3 text-3xl font-black">Current ranking</h1>

                        <div className="mt-6 grid gap-3">
                            {state.leaderboard.slice(0, 10).map((player) => (
                                <div
                                    key={player.id}
                                    className={`flex items-center justify-between rounded-2xl px-5 py-4 ${
                                        player.id === state.player?.id
                                            ? "bg-red-600 text-white"
                                            : "bg-gray-50"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="font-black">#{player.rank}</span>
                                        <span className="font-bold">{player.nickname}</span>
                                    </div>
                                    <span className="font-black">{player.score}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}

                {state.game.status === "finished" ? (
                    <div className="rounded-[2rem] bg-white p-8 text-center shadow-xl shadow-red-100">
                        <p className="font-black text-red-600">Game Finished</p>

                        <h1 className="mt-4 text-4xl font-black">Final Result</h1>

                        {state.leaderboard[0] ? (
                            <div className="mt-8 rounded-[2rem] bg-yellow-50 p-6">
                                <p className="text-sm font-bold text-gray-600">Winner</p>
                                <p className="mt-2 text-3xl font-black">
                                    {state.leaderboard[0].nickname}
                                </p>
                                <p className="mt-2 text-xl font-black text-red-600">
                                    {state.leaderboard[0].score} points
                                </p>
                            </div>
                        ) : null}

                        {myRank ? (
                            <div className="mt-6 rounded-2xl bg-gray-50 p-5">
                                <p className="text-sm font-bold text-gray-600">Your result</p>
                                <p className="mt-2 text-2xl font-black">
                                    #{myRank.rank} — {myRank.score} points
                                </p>
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </section>
        </main>
    );
}