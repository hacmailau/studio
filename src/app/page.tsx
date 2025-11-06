"use client";

import { useState } from "react";
import { Loader2, ServerCrash } from "lucide-react";
import { FileUploader } from "@/components/file-uploader";
import { GanttChart } from "@/components/gantt-chart";
import { ValidationErrors } from "@/components/validation-errors";
import { PredictDuration } from "@/components/predict-duration";
import { parseAndValidateExcel } from "@/lib/steel-processing";
import type { GanttHeat, ValidationError } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SteelGanttVisionIcon } from "@/components/icons";

export default function Home() {
  const [ganttData, setGanttData] = useState<GanttHeat[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileProcess = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setGanttData([]);
    setValidationErrors([]);

    try {
      const { validHeats, validationErrors } = await parseAndValidateExcel(file);
      setGanttData(validHeats);
      setValidationErrors(validationErrors);
    } catch (e: any) {
      console.error(e);
      setError(`An unexpected error occurred: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-10 flex items-center h-16 px-4 border-b bg-background/80 backdrop-blur-sm md:px-6">
        <div className="flex items-center gap-3">
            <SteelGanttVisionIcon className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold tracking-tighter font-headline">
              Steel Gantt Vision
            </h1>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-1">
            <FileUploader onFileProcess={handleFileProcess} isLoading={isLoading} />
            <PredictDuration historicalData={ganttData} />
            {error && (
              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <ServerCrash className="w-5 h-5" />
                    Processing Error
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-destructive-foreground">{error}</p>
                </CardContent>
              </Card>
            )}
            <ValidationErrors errors={validationErrors} />
          </div>
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="font-headline">Gantt Chart</CardTitle>
              </CardHeader>
              <CardContent className="pl-0">
                {isLoading ? (
                  <div className="flex items-center justify-center h-[600px]">
                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                  </div>
                ) : ganttData.length > 0 ? (
                  <GanttChart data={ganttData} />
                ) : (
                  <div className="flex items-center justify-center h-[600px] text-muted-foreground">
                    <p>Upload an Excel file to generate the Gantt chart.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
