"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CreateGameResponse = {
    success: boolean;
    message?: string;
    game?: {
        gameCode: string;
    };
};

export default function CreateHostGamePage() {
    const router = useRouter();

    const [title, setTitle] = useState("საქართველოს დამოუკიდებლობის დღის ვიქტორინა");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function createGame() {
        try {
            setLoading(true);
            setError("");

            const response = await fetch("/api/games/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title,
                }),
            });

            const data = (await response.json()) as CreateGameResponse;

            if (!response.ok || !data.success || !data.game?.gameCode) {
                throw new Error(data.message || "Failed to create game.");
            }

            router.push(`/host/${data.game.gameCode}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-[#fff7f7] px-6 py-10 text-[#111111]">
            <section className="mx-auto flex min-h-[80vh] max-w-3xl flex-col justify-center">
                <div className="rounded-[2rem] border border-red-100 bg-white p-8 shadow-xl shadow-red-100 md:p-12">
                    <p className="text-sm font-bold uppercase tracking-[0.25em] text-red-600">
                        ჰოსტის პანელი
                    </p>

                    <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
                        შექმენით ახალი ვიქტორინა
                    </h1>

                    <p className="mt-4 text-lg leading-8 text-gray-600">
                        შექმნება ლაივ სათამაშო ოთახი მოთამაშეებისთვის QR კოდით.
                    </p>

                    <label className="mt-8 block text-sm font-bold text-gray-700">
                        თამაშის სათაური
                    </label>

                    <input
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        className="mt-3 w-full rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 text-lg font-semibold outline-none transition focus:border-red-400 focus:bg-white"
                        placeholder="საქართველოს დამოუკიდებლობის დღის ვიქტორინა"
                    />

                    {error ? (
                        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
                            {error}
                        </div>
                    ) : null}

                    <button
                        onClick={createGame}
                        disabled={loading}
                        className="mt-8 w-full rounded-2xl bg-red-600 px-8 py-4 text-lg font-black text-white shadow-lg shadow-red-200 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? "იქმნება..." : "თამაშის შექმნა"}
                    </button>
                </div>
            </section>
        </main>
    );
}