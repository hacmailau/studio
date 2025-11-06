"use client";

import { AlertTriangle, AlertCircle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ValidationError } from "@/lib/types";

interface ValidationErrorsProps {
  errors: ValidationError[];
  title: string;
  description: string;
  isWarning?: boolean;
}

export function ValidationErrors({ errors, title, description, isWarning = false }: ValidationErrorsProps) {
  if (errors.length === 0) {
    return null;
  }
  
  const icon = isWarning ? 
    <AlertCircle className="w-5 h-5 text-yellow-500" /> : 
    <AlertTriangle className="w-5 h-5 text-destructive" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
            {icon}
            {title}
        </CardTitle>
        <CardDescription>
          {errors.length} mẻ có vấn đề. {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {errors.map((error, index) => (
            <AccordionItem value={`${error.heat_id}-${index}`} key={`${error.heat_id}-${index}`}>
              <AccordionTrigger>
                  Mẻ: {error.heat_id} - <span className="ml-1 font-semibold">{error.kind}</span>
              </AccordionTrigger>
              <AccordionContent>
                <Alert variant={isWarning ? "default" : "destructive"} className={isWarning ? "border-yellow-500/50 text-yellow-600 dark:text-yellow-400" : ""}>
                   {isWarning ? <AlertCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  <AlertTitle>{error.kind}</AlertTitle>
                  <AlertDescription>
                   {error.message}
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
