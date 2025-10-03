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
    const [isChatVisible, setIsChatVisible] = useState(true);

    const openModal = () => setIsModalOpen(true);
    const closeModal = () => setIsModalOpen(false);

    const toggleChat = () => setIsChatVisible(!isChatVisible);

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
                    <Button onClick={openModal}>Upload File</Button>
                    <Button variant="outline" onClick={toggleChat}>
                        {isChatVisible ? 'Hide Chat' : 'Show Chat'}
                    </Button>
                </div>
                <DocumentList folderName={selectedFolderId ? "Selected Folder" : "No Folder Selected"} />
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
                    // You can add additional logic here, like refreshing the document list
                }}
                onUploadError={(error) => {
                    console.error('Upload error:', error);
                    // You can add error handling here, like showing a toast notification
                }}
            />
        </div>
    )
}

export default HomePage