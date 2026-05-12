import Link from "next/link";

export default function HomePage() {
    return (
        <main className="min-h-screen bg-[#fff7f7] text-[#1f1f1f]">
            <section className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-16 text-center">
                <div className="mb-6 rounded-full border border-red-200 bg-white px-5 py-2 text-sm font-semibold text-red-700 shadow-sm">
                    საქართველოს დამოუკიდებლობის დღის უნივერსიტეტის ვიქტორინა
                </div>

                <h1 className="max-w-3xl text-5xl font-black tracking-tight text-[#111111] md:text-7xl">
                    KiuHoot
                </h1>

                <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-700 md:text-xl">
                    26 მაისის უნივერსიტეტის ღონისძიებისთვის ონლაინ ვიქტორინა. შექმენით თამაში,
                    აჩვენეთ QR კოდი, მიეცით მოთამაშეებს საშუალება შეუერთდნენ და ჩაატარეთ ვიქტორინა მასპინძლის
                    ეკრანიდან
                </p>

                <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                    <Link
                        href="/host"
                        className="rounded-2xl bg-red-600 px-8 py-4 text-lg font-bold text-white shadow-lg shadow-red-200 transition hover:bg-red-700"
                    >
                        შექმენით ჰოსტის თამაში
                    </Link>
                </div>
            </section>
        </main>
    );
}