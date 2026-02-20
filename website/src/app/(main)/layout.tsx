import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import ProtectedLayout from "@/components/providers/ProtectedLayout";

export default function MainLayout({ children }: { children: React.ReactNode }) {
    return (
        <ProtectedLayout>
            <div className="flex min-h-screen">
                <Sidebar />
                <main className="flex-1 lg:ml-64 pb-20 lg:pb-0">
                    {children}
                </main>
                <MobileNav />
            </div>
        </ProtectedLayout>
    );
}
