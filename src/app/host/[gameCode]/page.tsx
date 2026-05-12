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
        phaseAutoAdvanceAt: string | null;
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

const OPTION_SYMBOLS = ["▲", "◆", "●", "■"];

const OPTION_STYLES = [
    "bg-[#E21B3C] text-white shadow-red-200",
    "bg-[#1368CE] text-white shadow-blue-200",
    "bg-[#D89E00] text-white shadow-yellow-200",
    "bg-[#26890C] text-white shadow-green-200",
];

export default function HostGamePage() {
    const params = useParams<{ gameCode: string }>();
    const gameCode = params.gameCode;

    const [state, setState] = useState<GameState | null>(null);
    const [error, setError] = useState("");
    const [actionLoading, setActionLoading] = useState("");
    const [now, setNow] = useState(Date.now());

    const playUrl = useMemo(() => {
        const appUrl =
            process.env.NEXT_PUBLIC_APP_URL ||
            (typeof window !== "undefined" ? window.location.origin : "");

        return appUrl ? `${appUrl}/play/${gameCode}` : "";
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
        }, 600);

        const clock = window.setInterval(() => {
            setNow(Date.now());
        }, 150);

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

    const autoAdvanceSeconds = useMemo(() => {
        if (!state?.game.phaseAutoAdvanceAt) return 0;

        const end = new Date(state.game.phaseAutoAdvanceAt).getTime();
        return Math.max(0, Math.ceil((end - now) / 1000));
    }, [state?.game.phaseAutoAdvanceAt, now]);

    const status = state?.game.status;

    const isGameScreen =
        status === "question" ||
        status === "answer_reveal" ||
        status === "leaderboard" ||
        status === "finished";

    const answerPercent =
        state && state.players.length > 0
            ? Math.round((state.answerCount / state.players.length) * 100)
            : 0;

    return (
        <main className="kh-gradient-bg min-h-screen overflow-hidden text-[#111111]">
            <section
                className={
                    isGameScreen
                        ? "mx-auto min-h-screen max-w-7xl px-5 py-5"
                        : "mx-auto grid min-h-screen max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[1fr_380px]"
                }
            >
                <div
                    className={
                        isGameScreen
                            ? "kh-glass-card min-h-[calc(100vh-40px)] rounded-[2rem] p-7"
                            : "kh-glass-card rounded-[2rem] p-8"
                    }
                >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.35em] text-red-600">
                                KiuHoot Live
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

                        <div className="rounded-2xl bg-red-600 px-5 py-3 text-center text-white shadow-xl shadow-red-200">
                            <p className="text-[10px] font-bold uppercase tracking-widest">
                                თამაშის კოდი
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
                            თამაში იტვირთება...
                        </div>
                    ) : null}

                    {state && status === "lobby" ? (
                        <div className="mt-10 grid gap-8 lg:grid-cols-[320px_1fr]">
                            <div className="rounded-[2rem] border border-gray-200 bg-white/70 p-6 text-center shadow-sm">
                                {playUrl ? (
                                    <div className="rounded-3xl bg-white p-4 shadow-inner">
                                        <QRCodeSVG value={playUrl} size={260} />
                                    </div>
                                ) : null}

                                <p className="mt-5 break-all text-sm font-semibold text-gray-600">
                                    {playUrl}
                                </p>
                            </div>

                            <div>
                                <h2 className="text-4xl font-black">მოთამაშეების მოლოდინში</h2>
                                <p className="mt-2 text-lg text-gray-600">
                                    მოთამაშეები შეუერთდნენ:{" "}
                                    <span className="font-black text-red-600">
                    {state.players.length}
                  </span>
                                </p>

                                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                                    {state.players.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-gray-500">
                                            მოთამაშეები ჯერ არ არიან.
                                        </div>
                                    ) : (
                                        state.players.map((player) => (
                                            <div
                                                key={player.id}
                                                className="kh-animate-pop rounded-2xl border border-gray-100 bg-white px-5 py-4 font-black shadow-sm"
                                            >
                                                {player.nickname}
                                            </div>
                                        ))
                                    )}
                                </div>

                                <button
                                    onClick={() => hostAction("start")}
                                    disabled={Boolean(actionLoading)}
                                    className="mt-8 rounded-2xl bg-red-600 px-8 py-4 text-lg font-black text-white shadow-xl shadow-red-200 transition hover:scale-[1.03] hover:bg-red-700 disabled:opacity-60"
                                >
                                    {actionLoading === "start" ? "იწყება..." : "თამაშის დაწყება"}
                                </button>
                            </div>
                        </div>
                    ) : null}

                    {state && status === "question" && state.currentQuestion ? (
                        <div className="flex min-h-[calc(100vh-180px)] flex-col justify-between pt-6">
                            <div className="kh-animate-fade">
                                <div className="flex items-start justify-between gap-6">
                                    <div className="max-w-5xl">
                                        <p className="text-base font-black text-red-600 md:text-lg">
                                            კითხვა {state.currentQuestion.index + 1} /{" "}
                                            {state.game.questionsCount}
                                        </p>

                                        <h2 className="mt-4 text-[clamp(2.3rem,5vw,5.4rem)] font-black leading-[1.05] tracking-tight">
                                            {state.currentQuestion.questionText}
                                        </h2>
                                    </div>

                                    <div
                                        className={
                                            secondsLeft <= 5
                                                ? "kh-timer-danger rounded-full bg-red-600 px-8 py-6 text-center text-white shadow-xl shadow-red-200"
                                                : "rounded-full bg-red-600 px-8 py-6 text-center text-white shadow-xl shadow-red-200"
                                        }
                                    >
                                        <p className="text-xs font-bold uppercase tracking-widest">
                                            დრო
                                        </p>
                                        <p className="text-5xl font-black">{secondsLeft}</p>
                                    </div>
                                </div>

                                <div className="mt-5 h-5 overflow-hidden rounded-full bg-gray-100 shadow-inner">
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

                                <div className="mt-4 flex items-center justify-between gap-4">
                                    <p className="text-lg font-bold text-gray-600">
                                        წარდგენილი პასუხები:{" "}
                                        <span className="text-red-600">{state.answerCount}</span> /{" "}
                                        {state.players.length}
                                    </p>

                                    <p className="text-lg font-black text-red-600">
                                        {answerPercent}%
                                    </p>
                                </div>
                            </div>

                            <div className="mt-7 grid gap-4 md:grid-cols-2">
                                {state.currentQuestion.options.map((option) => (
                                    <div
                                        key={option.index}
                                        className={`kh-option-tile kh-animate-pop ${
                                            OPTION_STYLES[option.index]
                                        }`}
                                    >
                    <span className="mr-4 text-3xl">
                      {OPTION_SYMBOLS[option.index]}
                    </span>
                                        {option.text}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {state && status === "answer_reveal" && state.currentQuestion ? (
                        <div className="flex min-h-[calc(100vh-180px)] flex-col justify-between pt-6">
                            <div className="kh-animate-pop">
                                <p className="text-lg font-black uppercase tracking-[0.25em] text-red-600">
                                    დრო დასრულდა
                                </p>

                                <h2 className="mt-4 text-[clamp(2.5rem,5vw,5.8rem)] font-black leading-tight">
                                    სწორი პასუხი:
                                </h2>

                                <p className="mt-3 text-[clamp(2rem,4vw,4.6rem)] font-black text-green-700">
                                    {
                                        state.currentQuestion.options[
                                        state.currentQuestion.correctOptionIndex ?? 0
                                            ]?.text
                                    }
                                </p>

                                <p className="mt-4 text-xl font-bold text-gray-600">
                                    ლიდერბორდი გამოჩნდება {autoAdvanceSeconds} წამში
                                </p>
                            </div>

                            <div className="mt-8 grid gap-4 md:grid-cols-2">
                                {state.currentQuestion.options.map((option) => {
                                    const isCorrect =
                                        option.index === state.currentQuestion?.correctOptionIndex;

                                    return (
                                        <div
                                            key={option.index}
                                            className={`kh-option-tile transition-all duration-500 ${
                                                isCorrect
                                                    ? `${OPTION_STYLES[option.index]} kh-winner-pulse ring-4 ring-white`
                                                    : "bg-gray-100 text-gray-400 opacity-50"
                                            }`}
                                        >
                      <span className="mr-4 text-3xl">
                        {OPTION_SYMBOLS[option.index]}
                      </span>
                                            {option.text}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}

                    {state && status === "leaderboard" ? (
                        <div className="pt-6">
                            <p className="text-lg font-black uppercase tracking-[0.25em] text-red-600">
                                ლიდერბორდი
                            </p>

                            <div className="flex flex-wrap items-end justify-between gap-4">
                                <h2 className="mt-3 text-[clamp(3rem,6vw,6.5rem)] font-black leading-none">
                                    მიმდინარე რეიტინგი
                                </h2>

                                <p className="text-xl font-black text-gray-600">
                                    შემდეგი{" "}
                                    <span className="text-red-600">{autoAdvanceSeconds} წამში</span>
                                </p>
                            </div>

                            <div className="mt-8 grid gap-3">
                                {state.leaderboard.slice(0, 8).map((player) => (
                                    <div
                                        key={player.id}
                                        className="kh-animate-slide flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-6 py-4 shadow-md"
                                    >
                                        <div className="flex items-center gap-5">
                                            <div
                                                className={
                                                    player.rank === 1
                                                        ? "flex h-14 w-14 items-center justify-center rounded-full bg-yellow-400 text-2xl font-black text-white shadow-lg shadow-yellow-200"
                                                        : "flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-2xl font-black text-white"
                                                }
                                            >
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
                        </div>
                    ) : null}

                    {state && status === "finished" ? (
                        <div className="relative flex min-h-[calc(100vh-160px)] flex-col items-center justify-center overflow-hidden text-center">
                            <div className="kh-confetti">
                                <span />
                                <span />
                                <span />
                                <span />
                                <span />
                                <span />
                                <span />
                                <span />
                            </div>

                            <div className="kh-animate-pop">
                                <p className="text-lg font-black uppercase tracking-[0.3em] text-red-600">
                                    თამაში დასრულდა
                                </p>

                                <h2 className="mt-5 text-[clamp(4rem,9vw,9rem)] font-black leading-none">
                                    გამარჯვებული
                                </h2>

                                {state.leaderboard[0] ? (
                                    <div className="kh-winner-card mx-auto mt-10 max-w-2xl rounded-[2rem] border border-yellow-200 bg-yellow-50 p-10 shadow-2xl shadow-yellow-100">
                                        <p className="text-[clamp(3rem,6vw,6rem)] font-black leading-none">
                                            {state.leaderboard[0].nickname}
                                        </p>
                                        <p className="mt-6 text-4xl font-black text-red-600">
                                            {state.leaderboard[0].score} ქულა
                                        </p>
                                    </div>
                                ) : (
                                    <p className="mt-8 text-xl font-bold text-gray-500">
                                        არცერთი მოთამაშე არ შემოუერთდა.
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : null}
                </div>

                {!isGameScreen ? (
                    <aside className="kh-glass-card rounded-[2rem] p-6">
                        <h2 className="text-2xl font-black">მოთამაშეები</h2>

                        <div className="mt-5 grid gap-3">
                            {state?.players.length ? (
                                state.players.map((player) => (
                                    <div
                                        key={player.id}
                                        className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm"
                                    >
                                        <span className="font-bold">{player.nickname}</span>
                                        <span className="font-black text-red-600">
                      {player.score}
                    </span>
                                    </div>
                                ))
                            ) : (
                                <p className="rounded-2xl border border-dashed border-gray-300 p-4 text-gray-500">
                                    მოთამაშეები ჯერ არ არიან.
                                </p>
                            )}
                        </div>
                    </aside>
                ) : null}
            </section>
        </main>
    );
}