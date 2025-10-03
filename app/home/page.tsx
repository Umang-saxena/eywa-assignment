"use client";
import React from 'react'
import { ChatPanel } from '@/components/ChatPanel'
import { FolderList } from '@/components/FolderList'
import { DocumentList } from '@/components/DocumentList'
import { useState } from 'react'

const HomePage = () => {
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

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
            <div className="flex-1 border-r border-border">
                <DocumentList folderName={selectedFolderId ? "Selected Folder" : "No Folder Selected"} />
            </div>

            {/* Right Panel - Chat */}
            <div className="w-96">
                <ChatPanel />
            </div>
        </div>
    )
}

export default HomePage