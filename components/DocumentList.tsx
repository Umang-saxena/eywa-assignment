import { useState, useEffect } from "react";
import { Upload, FileText, File, MoreVertical, Trash2, Loader2, CheckCircle2, AlertCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface Document {
    id: string;
    name: string;
    type: "pdf" | "txt";
    size: string;
    pages?: number;
    uploadedAt: string;
    status: "processing" | "ready" | "failed";
    path?: string;
}

interface DocumentListProps {
    folderName: string;
    folderId?: string | null;
    refreshTrigger?: number;
}

export function DocumentList({ folderName, folderId, refreshTrigger }: DocumentListProps) {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (folderId) {
            fetchDocuments(folderId);
        } else {
            setDocuments([]);
            setLoading(false);
        }
    }, [folderId, refreshTrigger]);

    const fetchDocuments = async (folderId: string) => {
        try {
            const response = await fetch(`/api/files?folder_id=${folderId}`);
            if (response.ok) {
                const data = await response.json();
                setDocuments(data);
            }
        } catch (error) {
            console.error("Error fetching documents:", error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status: Document["status"]) => {
        switch (status) {
            case "processing":
                return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
            case "ready":
                return <CheckCircle2 className="h-4 w-4 text-green-600" />;
            case "failed":
                return <AlertCircle className="h-4 w-4 text-destructive" />;
        }
    };

    const getStatusBadge = (status: Document["status"]) => {
        switch (status) {
            case "processing":
                return <Badge variant="secondary">Processing</Badge>;
            case "ready":
                return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Ready</Badge>;
            case "failed":
                return <Badge variant="destructive">Failed</Badge>;
        }
    };

    const filteredDocs = documents.filter((doc) =>
        doc.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleDelete = async (docId: string) => {
        try {
            const response = await fetch(`/api/files?id=${docId}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                setDocuments(documents.filter(d => d.id !== docId));
            } else {
                console.error("Failed to delete document");
            }
        } catch (error) {
            console.error("Error deleting document:", error);
        }
    };

    const handleView = (path?: string) => {
        if (!path) return;
        // Construct public URL for the file in Supabase storage
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/FileUpload/${path}`;
        window.open(publicUrl, "_blank");
    };

    return (
        <div className="h-full flex flex-col bg-background">
            <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">{folderName}</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {documents.length} document{documents.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>

                <Input
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {documents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                            <FileText className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2 text-foreground">No documents yet</h3>
                        <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                            Upload PDF or TXT files to start asking questions
                        </p>
                        <Button className="gap-2">
                            <Upload className="h-4 w-4" />
                            Upload Document
                        </Button>
                    </div>
                ) : filteredDocs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <p className="text-sm text-muted-foreground">No documents match your search</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {filteredDocs.map((doc) => (
                            <Card key={doc.id} className="p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                                        {doc.type === "pdf" ? (
                                            <FileText className="h-5 w-5 text-primary" />
                                        ) : (
                                            <File className="h-5 w-5 text-primary" />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate text-foreground">{doc.name}</p>
                                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                                    <span>{doc.size}</span>
                                                    {doc.pages && (
                                                        <>
                                                            <span>•</span>
                                                            <span>{doc.pages} pages</span>
                                                        </>
                                                    )}
                                                    <span>•</span>
                                                    <span>{doc.uploadedAt}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(doc.status)}
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem
                                                            className="text-destructive"
                                                            onClick={() => handleDelete(doc.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleView(doc.path)}
                                                        >
                                                            <Eye className="h-4 w-4 mr-2" />
                                                            View
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>

                                        <div className="mt-2">
                                            {getStatusBadge(doc.status)}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
