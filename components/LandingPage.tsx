import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText, FolderOpen, MessageSquare, Shield } from "lucide-react";

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-background">
            {/* Hero Section */}
            <section className="container mx-auto px-4 pt-20 pb-16 text-center">
                <h1 className="text-5xl md:text-6xl font-bold mb-6 text-foreground">
                    Your Documents,
                    <span className="text-primary"> Answered</span>
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                    Organize documents in folders and get instant, accurate answers from your content.
                    Every response backed by precise citations.
                </p>
                <Link href="/home">
                    <Button
                        size="lg"
                        className="text-lg px-8"
                    >
                        Get Started
                    </Button>
                </Link>
            </section>

            {/* Features Grid */}
            <section className="container mx-auto px-4 py-16">
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-card">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                            <FolderOpen className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="font-semibold mb-2 text-card-foreground">Organize by Folder</h3>
                        <p className="text-sm text-muted-foreground">
                            Create folders to keep your documents organized and isolated
                        </p>
                    </div>

                    <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-card">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                            <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="font-semibold mb-2 text-card-foreground">Upload Any Document</h3>
                        <p className="text-sm text-muted-foreground">
                            Support for PDFs and text files, even large 100+ page documents
                        </p>
                    </div>

                    <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-card">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                            <MessageSquare className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="font-semibold mb-2 text-card-foreground">Ask Questions</h3>
                        <p className="text-sm text-muted-foreground">
                            Get accurate answers from your documents with AI-powered retrieval
                        </p>
                    </div>

                    <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-card">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                            <Shield className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="font-semibold mb-2 text-card-foreground">Verified Citations</h3>
                        <p className="text-sm text-muted-foreground">
                            Every answer includes exact page and document references
                        </p>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="container mx-auto px-4 py-16 text-center">
                <div className="max-w-3xl mx-auto p-12 rounded-xl border bg-card">
                    <h2 className="text-3xl font-bold mb-4 text-card-foreground">
                        Ready to unlock your documents?
                    </h2>
                    <p className="text-muted-foreground mb-6">
                        Start organizing and querying your documents in seconds
                    </p>
                    <Link href="/home">
                        <Button size="lg">
                            Launch App
                        </Button>
                    </Link>
                </div>
            </section>
        </div>
    );
}