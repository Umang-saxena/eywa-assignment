"use client";
import React from 'react'
import { ChatPanel } from '@/components/ChatPanel'
import { FolderList } from '@/components/FolderList'
import { DocumentList } from '@/components/DocumentList'
import FileUploadModal from '@/components/FileUploadModal'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

const HomePage = () => {
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const openModal = () => setIsModalOpen(true);
    const closeModal = () => setIsModalOpen(false);

    const handleFileUpload = (file: File) => {
        // For now, just log the file info. Implement actual upload logic as needed.
        console.log('File uploaded:', file);
    };

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
            <div className="flex-1 border-r border-border p-4 flex flex-col">
                <div className="mb-4 flex justify-end">
                    <Button onClick={openModal}>Upload File</Button>
                </div>
                <DocumentList folderName={selectedFolderId ? "Selected Folder" : "No Folder Selected"} />
            </div>

            {/* Right Panel - Chat */}
            <div className="w-96">
                <ChatPanel />
            </div>

            <FileUploadModal
                isOpen={isModalOpen}
                onClose={closeModal}
                onUpload={handleFileUpload}
            />
        </div>
    )
}

export default HomePage