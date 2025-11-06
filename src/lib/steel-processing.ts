"use client";

import * as XLSX from "xlsx";
import type {
  RawOperation,
  GroupedData,
  ProcessingResult,
  Operation,
  GanttHeat,
  ValidationError,
} from "./types";

const UNIT_SEQUENCE: { [key: string]: { group: string; order: number } } = {
  KR1: { group: "KR", order: 1 },
  KR2: { group: "KR", order: 1 },
  BOF1: { group: "BOF", order: 2 },
  BOF2: { group: "BOF", order: 2 },
  BOF3: { group: "BOF", order: 2 },
  BOF4: { group: "BOF", order: 2 },
  BOF5: { group: "BOF", order: 2 },
  LF1: { group: "LF", order: 3 },
  LF2: { group: "LF", order: 3 },
  LF3: { group: "LF", order: 3 },
  LF4: { group: "LF", order: 3 },
  LF5: { group: "LF", order: 3 },
  BCM1: { group: "CASTER", order: 4 },
  TSC1: { group: "CASTER", order: 4 },
};

const getGroup = (unit: string): string => UNIT_SEQUENCE[unit]?.group || "UNKNOWN";
const getSequenceOrder = (unit: string): number => UNIT_SEQUENCE[unit]?.order || 99;

const calculateDuration = (start: Date, end: Date): number => {
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
};

function parseTime(
  timeValue: any,
  baseDate: Date,
  potentialPrevDate: Date | null
): Date | null {
  if (!timeValue) return null;

  let parsedDate: Date;

  if (timeValue instanceof Date) {
    parsedDate = timeValue;
  } else if (typeof timeValue === "string") {
    const timeParts = timeValue.match(/(\d+):(\d+)(?::(\d+))?/);
    if (!timeParts) return null;

    const [, hours, minutes, seconds] = timeParts.map(Number);
    parsedDate = new Date(baseDate);
    parsedDate.setHours(hours, minutes, seconds || 0, 0);
  } else if (typeof timeValue === "number") {
    // Handle Excel's time as a fraction of a day
    const date = XLSX.SSF.parse_date_code(timeValue);
    parsedDate = new Date(baseDate);
    parsedDate.setHours(date.H, date.M, date.S, 0);
  } else {
    return null;
  }

  // Handle overnight schedules
  if (potentialPrevDate && parsedDate < potentialPrevDate) {
    parsedDate.setDate(parsedDate.getDate() + 1);
  }

  return parsedDate;
}

function groupByHeatID(data: RawOperation[]): GroupedData {
  const grouped: GroupedData = {};
  data.forEach((row) => {
    // Normalize keys from row
    const normalizedRow: { [key: string]: any } = {};
    for (const key in row) {
        if (Object.prototype.hasOwnProperty.call(row, key)) {
            const normalizedKey = key.trim();
            normalizedRow[normalizedKey] = (row as any)[key];
        }
    }

    const heatIDKey = Object.keys(normalizedRow).find(k => k.toLowerCase() === 'heat_id');
    const steelGradeKey = Object.keys(normalizedRow).find(k => k.toLowerCase() === 'steel_grade');
    const unitKey = Object.keys(normalizedRow).find(k => k.toLowerCase() === 'unit');
    const startTimeKey = Object.keys(normalizedRow).find(k => k.toLowerCase() === 'start_time');
    const endTimeKey = Object.keys(normalizedRow).find(k => k.toLowerCase() === 'end_time');
    const durationMinKey = Object.keys(normalizedRow).find(k => k.toLowerCase() === 'duration_min');

    if (!heatIDKey || !normalizedRow[heatIDKey]) return;
    
    const heatID = String(normalizedRow[heatIDKey]);
    if (!grouped[heatID]) {
      grouped[heatID] = {
        Heat_ID: heatID,
        Steel_Grade: steelGradeKey ? normalizedRow[steelGradeKey] : undefined,
        operations: [],
      };
    }
    
    grouped[heatID].operations.push({
      unit: unitKey ? normalizedRow[unitKey] : undefined,
      Start_Time: startTimeKey ? normalizedRow[startTimeKey] : undefined,
      End_Time: endTimeKey ? normalizedRow[endTimeKey] : undefined,
      Duration_min: durationMinKey ? normalizedRow[durationMinKey] : undefined,
    });
  });
  return grouped;
}

function validateData(groupedData: GroupedData): ProcessingResult {
  const validHeats: GanttHeat[] = [];
  const validationErrors: ValidationError[] = [];
  const baseDate = new Date();
  baseDate.setHours(0, 0, 0, 0);

  Object.values(groupedData).forEach((heat) => {
    const heatErrors: string[] = [];
    let hasFatalError = false;

    const processedOps: Operation[] = [];
    let lastOpEndTime: Date | null = null;
    
    // Sort operations by sequence order first
    const sortedRawOps = heat.operations
      .map(op => ({ ...op, sequence_order: getSequenceOrder(op.unit!) }))
      .sort((a, b) => a.sequence_order - b.sequence_order);

    for (const rawOp of sortedRawOps) {
        if (!rawOp.unit || !rawOp.Start_Time || !rawOp.End_Time) {
            heatErrors.push(`(Unit: ${rawOp.unit || 'N/A'}) has missing unit, start time, or end time.`);
            hasFatalError = true;
            continue;
        }

        const startTime = parseTime(rawOp.Start_Time, baseDate, lastOpEndTime);
        if (!startTime) {
            heatErrors.push(`${rawOp.unit}: Invalid start time format: ${rawOp.Start_Time}`);
            hasFatalError = true;
            continue;
        }

        const endTime = parseTime(rawOp.End_Time, baseDate, startTime);
        if (!endTime) {
            heatErrors.push(`${rawOp.unit}: Invalid end time format: ${rawOp.End_Time}`);
            hasFatalError = true;
            continue;
        }

        if (endTime <= startTime) {
            heatErrors.push(`${rawOp.unit}: End time must be after start time.`);
            hasFatalError = true;
        }
        
        processedOps.push({
            unit: rawOp.unit,
            group: getGroup(rawOp.unit),
            sequence_order: getSequenceOrder(rawOp.unit),
            Start_Time: String(rawOp.Start_Time),
            End_Time: String(rawOp.End_Time),
            startTime,
            endTime,
            Duration_min: rawOp.Duration_min || calculateDuration(startTime, endTime),
        });

        lastOpEndTime = endTime;
    }

    if (hasFatalError) {
        validationErrors.push({ heat_id: heat.Heat_ID, errors: heatErrors });
        return;
    }

    // Process flow validation
    const hasBOF = processedOps.some((op) => op.group === "BOF");
    const hasLF = processedOps.some((op) => op.group === "LF");
    if (hasLF && !hasBOF) {
      heatErrors.push("Process Flow Error: LF operation found without a preceding BOF operation.");
    }
    
    // Check for overlaps
    for (let i = 1; i < processedOps.length; i++) {
        if (processedOps[i].startTime < processedOps[i - 1].endTime) {
            heatErrors.push(`Timing Error: ${processedOps[i].unit} starts before ${processedOps[i - 1].unit} finishes.`);
        }
    }

    if (heatErrors.length > 0) {
      validationErrors.push({ heat_id: heat.Heat_ID, errors: heatErrors });
    } else {
      validHeats.push({
        Heat_ID: heat.Heat_ID,
        Steel_Grade: heat.Steel_Grade,
        operations: processedOps,
      });
    }
  });

  return { validHeats, validationErrors };
}

export async function parseAndValidateExcel(file: File): Promise<ProcessingResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        if (!event.target?.result) {
          throw new Error("Failed to read file.");
        }
        const buffer = event.target.result;
        const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON with specific date format for time-only cells
        const rawData: RawOperation[] = XLSX.utils.sheet_to_json(worksheet, {
            raw: false, // Use formatted strings
            dateNF: 'HH:mm:ss' // Format for dates/times
        });

        const requiredColumns = ["Heat_ID", "Steel_Grade", "unit", "Start_Time", "End_Time"];
        const header: string[] = (XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] as string[]).map(h => h.trim());
        const lowerCaseHeader = header.map(h => h.toLowerCase());

        const missingColumns = requiredColumns.filter(col => !lowerCaseHeader.includes(col.toLowerCase()));

        if (missingColumns.length > 0) {
            throw new Error(`Missing required columns in Excel file: ${missingColumns.join(', ')}`);
        }

        const groupedData = groupByHeatID(rawData);
        const result = validateData(groupedData);
        resolve(result);
      } catch (error: any) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}
