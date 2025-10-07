"use client";
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';


interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (path: string) => void;
  onUploadError: (error: string) => void;
  folderId?: string | null;
}

interface ProgressState {
  file: string;
  page: number;
  totalPages: number;
}

const FileUploadModal: React.FC<FileUploadModalProps> = ({ isOpen, onClose, onUploadSuccess, onUploadError, folderId }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<ProgressState[]>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setProgress([]);
    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('file', file);
      });
      if (folderId) {
        formData.append('folder_id', folderId);
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        onUploadError('Upload failed');
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (data.type === 'progress') {
                setProgress(prev => {
                  const existing = prev.find(p => p.file === data.file);
                  if (existing) {
                    return prev.map(p => p.file === data.file ? { ...p, page: data.page, totalPages: data.totalPages } : p);
                  } else {
                    return [...prev, { file: data.file, page: data.page, totalPages: data.totalPages }];
                  }
                });
              } else if (data.type === 'complete') {
                if (data.uploadedFiles && data.uploadedFiles.length > 0) {
                  onUploadSuccess(data.uploadedFiles.map((f: any) => f.path).join(', '));
                }
                if (data.errors && data.errors.length > 0) {
                  onUploadError(`Some files failed: ${data.errors.map((e: any) => `${e.file}: ${e.error}`).join(', ')}`);
                }
                setSelectedFiles([]);
                onClose();
              } else if (data.type === 'error') {
                onUploadError(data.message);
              }
            } catch (e) {
              console.error('Failed to parse progress:', e);
            }
          }
        }
      }
    } catch (error) {
      onUploadError('Network error occurred');
    } finally {
      setIsUploading(false);
      setProgress([]);
    }
  };

  const handleClose = () => {
    setSelectedFiles([]);
    setProgress([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-96">
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input
              type="file"
              multiple
              onChange={handleFileChange}
              accept=".pdf,.txt"
              disabled={isUploading}
            />
            {selectedFiles.length > 0 && (
              <div className="text-sm text-muted-foreground">
                <p>Selected files:</p>
                <ul>
                  {selectedFiles.map((file, index) => (
                    <li key={index}>{file.name}</li>
                  ))}
                </ul>
              </div>
            )}
            {isUploading && progress.length > 0 && (
              <div className="space-y-2">
                {progress.map((p, index) => (
                  <div key={index}>
                    <p className="text-sm">{p.file}: Page {p.page} of {p.totalPages}</p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full"
                        style={{ width: `${(p.page / p.totalPages) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleClose} disabled={isUploading}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={selectedFiles.length === 0 || isUploading || !folderId}>
                {isUploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FileUploadModal;
