import type { Metadata } from "next";
import './styles/global.scss';
import Header from '@/app/components/Header';
import Footer from "@/app/components/Footer/Footer";
import PageWrapper from './pageWrapper';  // 名前を変更

export const metadata: Metadata = {
  title: "AI MONSTER CREATOR",
  description: "Create Monster Generate",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <PageWrapper>
        <Header />
        <main>
          {children}
        </main>
        <Footer />
      </PageWrapper>
    </html>
  );
}