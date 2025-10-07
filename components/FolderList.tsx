"use client";
import { useState, useEffect } from "react";
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
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FolderItem {
    id: string;
    name: string;
    docCount: number;
}

interface FolderListProps {
    selectedFolderId?: string | null;
    onSelectFolder: (folderId: string | null) => void;
    refreshTrigger?: number;
}

export function FolderList({ selectedFolderId, onSelectFolder, refreshTrigger }: FolderListProps) {
    const [folders, setFolders] = useState<FolderItem[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [loading, setLoading] = useState(true);
    const [folderToDelete, setFolderToDelete] = useState<FolderItem | null>(null);
    const [folderToRename, setFolderToRename] = useState<FolderItem | null>(null);
    const [renameFolderName, setRenameFolderName] = useState("");
    const router = useRouter();

    useEffect(() => {
        fetchFolders();
    }, []);

    useEffect(() => {
        if (refreshTrigger && refreshTrigger > 0) {
            fetchFolders();
        }
    }, [refreshTrigger]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/auth');
    };

    const fetchFolders = async () => {
    try {
        // console.log("Fetching folders with credentials");
        const response = await fetch('/api/folders',{
            method: 'GET',
            credentials: 'include',
        });
        if (response.ok) {
            const data = await response.json();
            setFolders(data);
        } else {
            console.error('Error fetching folders:', await response.json());
        }
    } catch (error) {
        console.error('Error fetching folders:', error);
    } finally {
        setLoading(false);
    }
};

const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
        const response = await fetch('/api/folders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ name: newFolderName.trim() }),
        });

        if (response.ok) {
            const newFolder = await response.json();
            setFolders([...folders, { ...newFolder, docCount: 0 }]);
            setNewFolderName("");
            setIsCreating(false);
        } else {
            console.error('Error creating folder:', await response.json());
        }
    } catch (error) {
        console.error('Error creating folder:', error);
    }
};

const handleDeleteFolder = async (folderId: string) => {
    try {
        const response = await fetch(`/api/folders?id=${folderId}`, {
            method: 'DELETE',
            credentials: 'include',
        });

        if (response.ok) {
            setFolders(folders.filter(f => f.id !== folderId));
            if (selectedFolderId === folderId) {
                onSelectFolder(folders.find(f => f.id !== folderId)?.id || null);
            }
        } else {
            console.error('Error deleting folder:', await response.json());
        }
    } catch (error) {
        console.error('Error deleting folder:', error);
    }
};

const handleRenameFolder = async (folderId: string, newName: string) => {
    try {
        const response = await fetch(`/api/folders?id=${folderId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ name: newName }),
        });

        if (response.ok) {
            setFolders(folders.map(f => f.id === folderId ? { ...f, name: newName } : f));
        } else {
            console.error('Error renaming folder:', await response.json());
        }
    } catch (error) {
        console.error('Error renaming folder:', error);
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
                                            <DropdownMenuItem onClick={() => {
                                                setFolderToRename(folder);
                                                setRenameFolderName(folder.name);
                                            }}>
                                                <Pencil className="h-4 w-4 mr-2" />
                                                Rename
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="text-destructive"
                                                onClick={() => setFolderToDelete(folder)}
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
            <div className="p-4 border-t border-border">
                <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleLogout}
                >
                    Logout
                </Button>
            </div>

            <AlertDialog open={!!folderToDelete} onOpenChange={() => setFolderToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Folder</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{folderToDelete?.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => {
                            if (folderToDelete) {
                                handleDeleteFolder(folderToDelete.id);
                                setFolderToDelete(null);
                            }
                        }}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!folderToRename} onOpenChange={() => setFolderToRename(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Rename Folder</AlertDialogTitle>
                        <AlertDialogDescription>
                            Enter a new name for "{folderToRename?.name}".
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                        <Input
                            value={renameFolderName}
                            onChange={(e) => setRenameFolderName(e.target.value)}
                            placeholder="New folder name"
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => {
                            if (folderToRename && renameFolderName.trim()) {
                                handleRenameFolder(folderToRename.id, renameFolderName.trim());
                                setFolderToRename(null);
                            }
                        }}>Rename</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
