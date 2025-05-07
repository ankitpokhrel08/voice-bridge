import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import Container from "@/components/layout/Container";
import NavBar from "@/components/layout/NavBar";
import SocketProvider from "@/providers/SocketProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Live Video Transcribe",
  description: "This app transcibes live video/audio streams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
        <html lang="en">
          <body className={inter.className}>
          <SocketProvider>
            <main className='flex flex-col min-h-screen bg-secondary'>
              <NavBar />
              {/* <section className='flex-grow'> */}
                <Container>
                  {children}
                </Container>
            </main>
      </SocketProvider>
          </body>
        </html>
    </ClerkProvider>
  );
}
