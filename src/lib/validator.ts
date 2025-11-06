
import type { ExcelRow, ValidationError, Operation, GanttHeat } from "./types";
import { groupBy } from "lodash";

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
  TSC2: { group: "CASTER", order: 4 },
};

function parseTimeWithDate(dateStr: string, hhmm: string, prevTime?: Date): Date | null {
    if (!dateStr || !hhmm) return null;

    const [hours, minutes] = hhmm.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return null;

    const baseDate = new Date(dateStr);
    if (isNaN(baseDate.getTime())) return null;
    
    // Create current time based on the given date and time parts
    let currentTime = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hours, minutes);

    // Handle overnight rollover: if current time is earlier than previous time, add a day
    if (prevTime && currentTime < prevTime) {
        currentTime.setDate(currentTime.getDate() + 1);
    }
    
    return currentTime;
}

export function validateAndTransform(rows: ExcelRow[]): { validHeats: GanttHeat[], errors: ValidationError[] } {
    const errors: ValidationError[] = [];
    const validHeats: GanttHeat[] = [];
    
    const heats = groupBy(rows, 'heatId');

    for (const heatId in heats) {
        const heatRows = heats[heatId];
        const ops: Operation[] = [];
        let heatHasFatalError = false;
        
        let lastOpEndTime: Date | undefined = undefined;

        // Sort by sequence number, then by raw index to maintain stability
        const sortedRows = heatRows.sort((a, b) => {
            const seqA = a.seqNum ?? Infinity;
            const seqB = b.seqNum ?? Infinity;
            if(seqA !== seqB) return seqA - seqB;
            return a.rawIndex - b.rawIndex;
        });

        for (let i = 0; i < sortedRows.length; i++) {
            const row = sortedRows[i];
            const unitInfo = UNIT_SEQUENCE[row.unit.toUpperCase()];
            
            if (!unitInfo) {
                errors.push({ heat_id: heatId, kind: 'UNIT', message: `Đơn vị không xác định: '${row.unit}'.`, opIndex: i });
                continue; // Skip this operation
            }
            
            const startTime = parseTimeWithDate(row.dateStr, row.startStr, lastOpEndTime);
            if (!startTime) {
                 errors.push({ heat_id: heatId, kind: 'FORMAT', message: `Thời gian bắt đầu không hợp lệ '${row.startStr}' cho đơn vị ${row.unit}.`, opIndex: i });
                 heatHasFatalError = true;
                 continue;
            }

            const endTime = parseTimeWithDate(row.dateStr, row.endStr, startTime);
            if (!endTime) {
                 errors.push({ heat_id: heatId, kind: 'FORMAT', message: `Thời gian kết thúc không hợp lệ '${row.endStr}' cho đơn vị ${row.unit}.`, opIndex: i });
                 heatHasFatalError = true;
                 continue;
            }
            
            const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
            if (duration < 0) {
                errors.push({ heat_id: heatId, kind: 'TIME', message: `Thời gian kết thúc phải sau thời gian bắt đầu cho đơn vị ${row.unit}.`, opIndex: i });
                heatHasFatalError = true;
            }

            const idleTime = lastOpEndTime ? (startTime.getTime() - lastOpEndTime.getTime()) / (1000 * 60) : 0;
            
            ops.push({
                unit: row.unit,
                group: unitInfo.group,
                sequence_order: row.seqNum ?? unitInfo.order,
                startTime,
                endTime,
                Duration_min: duration,
                idleTimeMinutes: Math.round(idleTime),
            });
            lastOpEndTime = endTime;
        }

        if(heatHasFatalError) continue;

        // Sort ops again based on final sequence order and start times for routing validation
        ops.sort((a,b) => {
            if(a.sequence_order !== b.sequence_order) return a.sequence_order - b.sequence_order;
            return a.startTime.getTime() - b.startTime.getTime();
        });


        // Routing validation
        const bofOp = ops.find(op => op.group === 'BOF');
        const lfOp = ops.find(op => op.group === 'LF');

        if (lfOp && !bofOp) {
             errors.push({ heat_id: heatId, kind: 'ROUTING', message: 'Tìm thấy công đoạn LF nhưng không có công đoạn BOF trước đó.' });
        }
        if(lfOp && bofOp && lfOp.startTime < bofOp.endTime) {
            errors.push({ heat_id: heatId, kind: 'ROUTING', message: 'Công đoạn LF bắt đầu trước khi công đoạn BOF kết thúc.' });
        }


        // Final check for timing overlaps between sorted operations
        for (let i = 1; i < ops.length; i++) {
            if (ops[i].startTime < ops[i - 1].endTime) {
                errors.push({ 
                    heat_id: heatId, 
                    kind: 'TIME', 
                    message: `Chồng chéo thời gian: ${ops[i].unit} bắt đầu trước khi ${ops[i-1].unit} kết thúc.` 
                });
            }
        }


        if (errors.filter(e => e.heat_id === heatId).length === 0) {
            const hasCaster = ops.some(op => op.group === 'CASTER');
            validHeats.push({
                Heat_ID: heatId,
                Steel_Grade: heatRows[0].steelGrade,
                operations: ops,
                isComplete: hasCaster
            });
        }
    }

    return { validHeats, errors };
}
