"use client";
import { useState } from "react";
import { FolderPlus, Folder, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";

interface FolderItem {
    id: string;
    name: string;
    docCount: number;
}

interface FolderListProps {
    selectedFolderId?: string;
    onSelectFolder: (folderId: string) => void;
}

export function FolderList({ selectedFolderId, onSelectFolder }: FolderListProps) {
    const [folders, setFolders] = useState<FolderItem[]>([
        { id: "1", name: "Research Papers", docCount: 12 },
        { id: "2", name: "Legal Documents", docCount: 8 },
    ]);
    const [isCreating, setIsCreating] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");

    const handleCreateFolder = () => {
        if (newFolderName.trim()) {
            const newFolder: FolderItem = {
                id: Date.now().toString(),
                name: newFolderName.trim(),
                docCount: 0,
            };
            setFolders([...folders, newFolder]);
            setNewFolderName("");
            setIsCreating(false);
        }
    };

    const handleDeleteFolder = (folderId: string) => {
        setFolders(folders.filter(f => f.id !== folderId));
        if (selectedFolderId === folderId) {
            onSelectFolder(folders[0]?.id || "");
        }
    };

    return (
        <div className="h-full flex flex-col border-r border-border bg-background">
            <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-foreground">Folders</h2>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setIsCreating(true)}
                        className="h-8 w-8"
                    >
                        <FolderPlus className="h-4 w-4" />
                    </Button>
                </div>

                {isCreating && (
                    <div className="flex gap-2">
                        <Input
                            placeholder="Folder name"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                            autoFocus
                            className="h-9"
                        />
                        <Button size="sm" onClick={handleCreateFolder}>
                            Create
                        </Button>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                {folders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-4">
                        <Folder className="h-12 w-12 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">No folders yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Create one to get started</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {folders.map((folder) => (
                            <Card
                                key={folder.id}
                                className={`p-3 cursor-pointer transition-colors hover:bg-accent group ${selectedFolderId === folder.id
                                        ? "bg-accent border-primary"
                                        : "border-transparent"
                                    }`}
                                onClick={() => onSelectFolder(folder.id)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <Folder className="h-4 w-4 text-primary flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate text-foreground">
                                                {folder.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {folder.docCount} docs
                                            </p>
                                        </div>
                                    </div>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 opacity-0 group-hover:opacity-100"
                                            >
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem>
                                                <Pencil className="h-4 w-4 mr-2" />
                                                Rename
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="text-destructive"
                                                onClick={() => handleDeleteFolder(folder.id)}
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
