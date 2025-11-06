"use client";

import React, { useRef } from "react";
import { Upload, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FileUploaderProps {
  onFileProcess: (file: File) => void;
  isLoading: boolean;
}

export function FileUploader({ onFileProcess, isLoading }: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileProcess(file);
    }
    // Reset file input to allow re-uploading the same file
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Import Schedule</CardTitle>
        <CardDescription>Upload steel production schedule (.xlsx, .xls)</CardDescription>
      </CardHeader>
      <CardContent>
        <Input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
          accept=".xlsx, .xls"
          disabled={isLoading}
        />
        <Button onClick={handleButtonClick} disabled={isLoading} className="w-full">
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          {isLoading ? "Processing..." : "Upload Excel File"}
        </Button>
      </CardContent>
    </Card>
  );
}
