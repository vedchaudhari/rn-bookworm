import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import AuthProvider from "@/components/providers/AuthProvider";

export const metadata: Metadata = {
    title: "Bookworm — Your Digital Reading Journey",
    description: "Track your reading, share books, connect with fellow readers, and build your literary legacy.",
    keywords: ["books", "reading", "bookshelf", "social", "library"],
    openGraph: {
        title: "Bookworm",
        description: "Your Digital Reading Journey",
        type: "website",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body className="antialiased">
                <AuthProvider>
                    {children}
                    <Toaster
                        position="top-right"
                        toastOptions={{
                            style: {
                                background: "rgba(14, 27, 36, 0.95)",
                                color: "#fff",
                                border: "1px solid rgba(25, 227, 209, 0.2)",
                                borderRadius: "12px",
                                backdropFilter: "blur(20px)",
                                fontFamily: "Inter, sans-serif",
                                fontSize: "14px",
                            },
                            success: {
                                iconTheme: { primary: "#19E3D1", secondary: "#0B0F14" },
                            },
                            error: {
                                iconTheme: { primary: "#EF4444", secondary: "#0B0F14" },
                            },
                        }}
                    />
                </AuthProvider>
            </body>
        </html>
    );
}
