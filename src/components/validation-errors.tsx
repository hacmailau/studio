"use client";

import { AlertTriangle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ValidationError } from "@/lib/types";

interface ValidationErrorsProps {
  errors: ValidationError[];
}

export function ValidationErrors({ errors }: ValidationErrorsProps) {
  if (errors.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          Validation Issues
        </CardTitle>
        <CardDescription>
          {errors.length} heat(s) have data inconsistencies.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {errors.map(({ heat_id, errors: heatErrors }) => (
            <AccordionItem value={heat_id} key={heat_id}>
              <AccordionTrigger>Heat ID: {heat_id}</AccordionTrigger>
              <AccordionContent>
                <Alert variant="destructive">
                  <AlertTitle>Errors Found</AlertTitle>
                  <AlertDescription>
                    <ul className="mt-2 ml-4 list-disc space-y-1">
                      {heatErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
