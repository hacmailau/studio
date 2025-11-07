
"use client";

import React, { useState } from "react";
import { Link, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface UrlUploaderProps {
  onUrlProcess: (url: string) => void;
  isLoading: boolean;
}

export function UrlUploader({ onUrlProcess, isLoading }: UrlUploaderProps) {
  const [url, setUrl] = useState("");

  const handleProcessClick = () => {
    if (url) {
      onUrlProcess(url);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Nhập từ URL</CardTitle>
        <CardDescription>Dán link Google Sheet hoặc link Excel online</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex w-full items-center space-x-2">
          <Input
            type="url"
            placeholder="https://docs.google.com/spreadsheets/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isLoading}
          />
          <Button onClick={handleProcessClick} disabled={isLoading || !url}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Link className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Lưu ý: Google Sheet cần được công khai (public).
        </p>
      </CardContent>
    </Card>
  );
}

    