"use client";
import React, { useState, useEffect } from 'react'
import { ChatPanel } from '@/components/ChatPanel'
import { FolderList } from '@/components/FolderList'
import { DocumentList } from '@/components/DocumentList'
import FileUploadModal from '@/components/FileUploadModal'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

interface Folder {
    id: string;
    name: string;
    docCount: number;
}

const HomePage = () => {
    const [folders, setFolders] = useState<Folder[]>([]);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isChatVisible, setIsChatVisible] = useState(true);
    const [loading, setLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const router = useRouter();

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setLoading(false);
                fetchFolders();
            } else {
                router.push('/auth');
            }
        };

        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user) {
                setLoading(false);
                fetchFolders();
            } else {
                router.push('/auth');
            }
        });

        return () => subscription.unsubscribe();
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
                <DocumentList folderName={selectedFolder ? selectedFolder.name : "No Folder Selected"} folderId={selectedFolderId} refreshTrigger={refreshTrigger} />
            </div>

            {/* Right Panel - Chat */}
            {isChatVisible && (
                <div className="w-96 border-l border-border">
                    <ChatPanel />
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
                }}
                onUploadError={(error) => {
                    console.error('Upload error:', error);
                    // You can add error handling here, like showing a toast notification
                }}
                folderId={selectedFolderId}
            />
        </div>
    )
}

export default HomePage