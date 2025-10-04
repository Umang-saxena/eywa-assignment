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

const FileUploadModal: React.FC<FileUploadModalProps> = ({ isOpen, onClose, onUploadSuccess, onUploadError, folderId }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
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

      const result = await response.json();

      if (response.ok) {
        if (result.uploadedFiles && result.uploadedFiles.length > 0) {
          onUploadSuccess(result.uploadedFiles.map((f: any) => f.path).join(', '));
        }
        if (result.errors && result.errors.length > 0) {
          onUploadError(`Some files failed: ${result.errors.map((e: any) => `${e.file}: ${e.error}`).join(', ')}`);
        }
        setSelectedFiles([]);
        onClose();
      } else {
        onUploadError(result.error || 'Upload failed');
      }
    } catch (error) {
      onUploadError('Network error occurred');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFiles([]);
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
