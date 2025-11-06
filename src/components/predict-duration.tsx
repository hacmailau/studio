"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Wand2, Loader2, Hourglass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { predictOperationDuration } from "@/ai/flows/predict-operation-duration";
import type { GanttHeat } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  heatId: z.string().min(1, "Heat ID is required."),
  unit: z.string().min(1, "Unit is required."),
});

interface PredictDurationProps {
  historicalData: GanttHeat[];
}

export function PredictDuration({ historicalData }: PredictDurationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [prediction, setPrediction] = useState<{ duration: number; explanation: string } | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      heatId: "",
      unit: "",
    },
  });

  const uniqueHeats = Array.from(new Set(historicalData.map(h => h.Heat_ID)));
  const uniqueUnits = Array.from(new Set(historicalData.flatMap(h => h.operations.map(o => o.unit))));

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setPrediction(null);

    const heat = historicalData.find(h => h.Heat_ID === values.heatId);
    if (!heat) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Selected Heat ID not found in the processed data.",
        });
        setIsLoading(false);
        return;
    }
    
    // Find last operation to get a sensible start time for prediction
    const lastOperation = heat.operations[heat.operations.length - 1];
    const startTime = lastOperation ? lastOperation.endTime.toISOString() : new Date().toISOString();


    try {
      const result = await predictOperationDuration({
        heatId: values.heatId,
        steelGrade: heat.Steel_Grade,
        unit: values.unit,
        startTime: startTime,
        historicalData: JSON.stringify(historicalData),
      });
      setPrediction({
        duration: result.predictedDurationMinutes,
        explanation: result.explanation,
      });
    } catch (error: any) {
        console.error("Prediction failed:", error);
        toast({
            variant: "destructive",
            title: "Prediction Failed",
            description: error.message || "An unknown error occurred.",
        });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-primary" />
          Predict Operation Duration
        </CardTitle>
        <CardDescription>Use AI to estimate the duration of a future operation.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="heatId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Heat ID</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={historicalData.length === 0}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a heat" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {uniqueHeats.map(id => <SelectItem key={id} value={id}>{id}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={historicalData.length === 0}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a unit" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {uniqueUnits.map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading || historicalData.length === 0}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Hourglass className="w-4 h-4 mr-2" />
              )}
              Predict Duration
            </Button>
          </form>
        </Form>
        {prediction && (
          <Card className="mt-4 bg-accent/20">
            <CardHeader>
                <CardTitle className="text-lg">AI Prediction Result</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-2xl font-bold">{prediction.duration} <span className="text-sm font-normal">minutes</span></p>
              <p className="text-sm text-muted-foreground">{prediction.explanation}</p>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
