"use client";
import React, { useState, useEffect } from 'react'
import { ChatPanel } from '@/components/ChatPanel'
import { FolderList } from '@/components/FolderList'
import { DocumentList } from '@/components/DocumentList'
import FileUploadModal from '@/components/FileUploadModal'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner';

interface Folder {
    id: string;
    name: string;
    docCount: number;
}

const HomePage = () => {
    const [folders, setFolders] = useState<Folder[]>([]);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
    const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isChatVisible, setIsChatVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [refreshFoldersTrigger, setRefreshFoldersTrigger] = useState(0);
    const router = useRouter();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await fetch('/api/auth/session', {
                    method: 'GET',
                    credentials: 'include',
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.user) {
                        setLoading(false);
                        fetchFolders();
                    } else {
                        router.push('/auth');
                    }
                } else {
                    router.push('/auth');
                }
            } catch (error) {
                console.error('Error checking session:', error);
                router.push('/auth');
            }
        };

        checkAuth();

        // Remove supabase.auth.onAuthStateChange subscription as session is checked via API
        // return () => subscription.unsubscribe();
    }, []);

    const fetchFolders = async () => {
        try {
            const response = await fetch('/api/folders',{
                method: 'GET',
                credentials: 'include',
            });
            if (response.ok) {
                const data = await response.json();
                setFolders(data);
            }
        } catch (error) {
            console.error('Error fetching folders:', error);
        }
    };

    const selectedFolder = folders.find(f => f.id === selectedFolderId);

    const openModal = () => setIsModalOpen(true);
    const closeModal = () => setIsModalOpen(false);

    const toggleChat = () => setIsChatVisible(!isChatVisible);

    const handleSelectFile = (fileId: string | null, fileName?: string | null) => {
        setSelectedFileId(fileId);
        setSelectedFileName(fileName || null);
        if (fileId) {
            setIsChatVisible(true);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    return (
        <div className="flex h-screen bg-background">
            {/* Left Panel - Folders */}
            <div className="w-64 border-r border-border bg-card">
                <FolderList
                    selectedFolderId={selectedFolderId || undefined}
                    onSelectFolder={setSelectedFolderId}
                    refreshTrigger={refreshFoldersTrigger}
                />
            </div>

            {/* Center Panel - Documents */}
            <div className={`flex-1 border-r border-border p-4 flex flex-col ${isChatVisible ? '' : 'border-r-0'}`}>
                <div className="mb-4 flex justify-between items-center">
                    <Button onClick={openModal} disabled={!selectedFolderId}>Upload File</Button>
                    <Button variant="outline" onClick={toggleChat}>
                        {isChatVisible ? 'Hide Chat' : 'Show Chat'}
                    </Button>
                </div>
                <DocumentList folderName={selectedFolder ? selectedFolder.name : "No Folder Selected"} folderId={selectedFolderId} refreshTrigger={refreshTrigger} selectedFileId={selectedFileId} onSelectFile={handleSelectFile} />
            </div>

            {/* Right Panel - Chat */}
            {isChatVisible && (
                <div className="w-96 border-l border-border h-full">
                    <ChatPanel selectedFileId={selectedFileId} selectedFileName={selectedFileName} />
                </div>
            )}

            <FileUploadModal
                isOpen={isModalOpen}
                onClose={closeModal}
                onUploadSuccess={(path) => {
                    console.log('File uploaded successfully:', path);
                    // Refresh folders and documents
                    fetchFolders();
                    setRefreshTrigger(prev => prev + 1);
                    setRefreshFoldersTrigger(prev => prev + 1);
                }}
                onUploadError={(error) => {
                    // toast.error('File upload failed');
                    console.error('Upload error:', error);
                    // You can add error handling here, like showing a toast notification
                }}
                folderId={selectedFolderId}
            />
        </div>
    )
}

export default HomePage