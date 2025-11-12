
import type { ExcelRow, ValidationError, Operation, GanttHeat } from "./types";
import { groupBy, sortBy } from "lodash";
import { startOfDay, format, subHours, addHours } from 'date-fns';

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
  BCM2: { group: "CASTER", order: 4 },
  BCM3: { group: "CASTER", order: 4 },
  TSC1: { group: "CASTER", order: 4 },
  TSC2: { group: "CASTER", order: 4 },
};

function parseTimeWithDate(dateStr: string, hhmm: string, referenceDate: Date, prevOpEndTime?: Date): Date | null {
    if (!hhmm || typeof hhmm !== 'string') return null;

    const timeParts = hhmm.match(/(\d+):(\d+)/);
    if (!timeParts) return null;

    const [, hoursStr, minutesStr] = timeParts;
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    if (isNaN(hours) || isNaN(minutes)) return null;
    
    let baseDate: Date;
    if (dateStr && !isNaN(new Date(dateStr).getTime())) {
        baseDate = startOfDay(new Date(dateStr));
    } else if (prevOpEndTime) {
        baseDate = startOfDay(prevOpEndTime);
    } else {
        baseDate = startOfDay(referenceDate);
    }

    // Create date as UTC to avoid timezone shifts. We treat the input time as the literal time.
    let currentTime = new Date(Date.UTC(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hours, minutes));
    
    if (prevOpEndTime && currentTime < prevOpEndTime && prevOpEndTime.getTime() - currentTime.getTime() > 12 * 60 * 60 * 1000) {
        currentTime.setUTCDate(currentTime.getUTCDate() + 1);
    }
    
    return currentTime;
}

export function validateAndTransform(rows: ExcelRow[]): { validHeats: GanttHeat[], errors: ValidationError[] } {
    const errors: ValidationError[] = [];
    const validHeats: GanttHeat[] = [];
    
    const firstDateStr = rows.find(r => r.dateStr)?.dateStr;
    const globalBaseDate = firstDateStr ? startOfDay(new Date(firstDateStr)) : new Date();

    const heats = groupBy(rows, 'heatId');

    for (const heatId in heats) {
        const heatRows = heats[heatId];
        let heatHasFatalError = false;

        const sortedRowsForParsing = heatRows.sort((a, b) => {
            if (a.seqNum != null && b.seqNum != null) {
                 if(a.seqNum !== b.seqNum) return a.seqNum - b.seqNum;
            }
            if(a.startStr && b.startStr) {
                if(a.startStr !== b.startStr) return a.startStr.localeCompare(b.startStr);
            }
            return a.rawIndex - b.rawIndex;
        });

        const tempOps: (Operation & { raw: ExcelRow })[] = [];
        let lastOpEndTime: Date | undefined = undefined;

        for (const row of sortedRowsForParsing) {
             const unitInfo = UNIT_SEQUENCE[row.unit.toUpperCase()];
            if (!unitInfo) {
                errors.push({ heat_id: heatId, kind: 'UNIT', unit: row.unit, message: `Đơn vị không xác định: '${row.unit}'.`, opIndex: row.rawIndex });
                continue;
            }

            const startTime = parseTimeWithDate(row.dateStr, row.startStr, globalBaseDate, lastOpEndTime);
            if (!startTime) {
                 errors.push({ heat_id: heatId, kind: 'FORMAT', unit: row.unit, message: `Thời gian bắt đầu không hợp lệ '${row.startStr}'.`, opIndex: row.rawIndex });
                 heatHasFatalError = true;
                 continue;
            }

            const endTime = parseTimeWithDate(row.dateStr, row.endStr, globalBaseDate, startTime);
            if (!endTime) {
                 errors.push({ heat_id: heatId, kind: 'FORMAT', unit: row.unit, message: `Thời gian kết thúc không hợp lệ '${row.endStr}'.`, opIndex: row.rawIndex });
                 heatHasFatalError = true;
                 continue;
            }
            
            if (endTime < startTime) {
                endTime.setUTCDate(endTime.getUTCDate() + 1);
            }
            const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

            tempOps.push({
                unit: row.unit,
                group: unitInfo.group,
                sequence_order: row.seqNum ?? unitInfo.order,
                startTime,
                endTime,
                Duration_min: Math.round(duration),
                raw: row,
            });
            lastOpEndTime = endTime;
        }

        if (heatHasFatalError) continue;

        const ops = tempOps.sort((a,b) => a.startTime.getTime() - b.startTime.getTime());

        let hasValidationError = false;
        
        for (let i = 1; i < ops.length; i++) {
            if (ops[i].startTime < ops[i - 1].endTime) {
                // This is an overlap, but we are allowing it as per user request.
                // You could add a warning here if needed.
                // errors.push({ heat_id: heatId, kind: 'OVERLAP', message: `Công đoạn ${ops[i].unit} bắt đầu trước khi ${ops[i - 1].unit} kết thúc.` });
            }
        }
        
        const groupCounts = ops.reduce((acc, op) => {
            acc[op.group] = (acc[op.group] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        for (const group in groupCounts) {
            if (group !== 'LF' && groupCounts[group] > 1) {
                const unitsInGroup = ops.filter(op => op.group === group).map(op => op.unit).join(', ');
                errors.push({ heat_id: heatId, kind: 'ROUTING', message: `Mẻ không thể chạy trên nhiều thiết bị cùng nhóm ${group}: ${unitsInGroup}.` });
                hasValidationError = true;
            }
        }

        const lfOps = ops.filter(op => op.group === 'LF');
        const bofOp = ops.find(op => op.group === 'BOF');

        if (lfOps.length > 0 && !bofOp) {
             errors.push({ heat_id: heatId, kind: 'ROUTING', unit: lfOps.map(o => o.unit).join(','), message: `Tìm thấy công đoạn LF nhưng không có công đoạn BOF trước đó.` });
             hasValidationError = true;
        }

        if (bofOp && lfOps.length > 0) {
            for (const lfOp of lfOps) {
                if (lfOp.startTime < bofOp.endTime) {
                     // Allow overlap but could be a warning
                }
            }
        }

        if (!hasValidationError) {
            for (let i = 1; i < ops.length; i++) {
                const idle = Math.round((ops[i].startTime.getTime() - ops[i - 1].endTime.getTime()) / (1000 * 60));
                ops[i].idleTimeMinutes = idle > 0 ? idle : 0;
            }
            if (ops.length > 0) {
              ops[0].idleTimeMinutes = 0;
            }

            const casterOp = ops.find(op => op.group === 'CASTER');
            const totalDuration = ops.reduce((acc, op) => acc + op.Duration_min, 0);
            const totalIdleTime = ops.reduce((acc, op) => acc + (op.idleTimeMinutes || 0), 0);

            validHeats.push({
                Heat_ID: heatId,
                Steel_Grade: heatRows[0].steelGrade,
                operations: ops.map(({raw, ...op}) => op),
                isComplete: !!casterOp,
                totalDuration,
                totalIdleTime,
                castingMachine: casterOp?.unit, // Add casting machine
                sequenceInCaster: undefined, // Will be calculated next
            });
        }
    }

    // Post-process to calculate sequenceInCaster based on a "production day" (8am to 8am)
    const getProductionDayKey = (date: Date): string => {
        // Since the date is UTC, we use UTC methods
        const checkDate = new Date(date);
        if (checkDate.getUTCHours() < 8) {
            checkDate.setUTCDate(checkDate.getUTCDate() - 1);
        }
        return `${checkDate.getUTCFullYear()}-${String(checkDate.getUTCMonth() + 1).padStart(2, '0')}-${String(checkDate.getUTCDate()).padStart(2, '0')}`;
    };
    
    // Group heats by casting machine and then by production day
    const heatsByCasterAndDay: Record<string, Record<string, GanttHeat[]>> = {};

    validHeats.forEach(heat => {
        if (!heat.castingMachine) return;

        const casterOp = heat.operations.find(op => op.unit === heat.castingMachine);
        if (!casterOp) return;
        
        const dayKey = getProductionDayKey(casterOp.startTime);

        if (!heatsByCasterAndDay[heat.castingMachine]) {
            heatsByCasterAndDay[heat.castingMachine] = {};
        }
        if (!heatsByCasterAndDay[heat.castingMachine][dayKey]) {
            heatsByCasterAndDay[heat.castingMachine][dayKey] = [];
        }
        heatsByCasterAndDay[heat.castingMachine][dayKey].push(heat);
    });

    // Sort heats within each group and assign sequence number
    for (const caster in heatsByCasterAndDay) {
        for (const day in heatsByCasterAndDay[caster]) {
            const sortedHeats = sortBy(heatsByCasterAndDay[caster][day], h => {
                const casterOp = h.operations.find(op => op.unit === h.castingMachine);
                return casterOp ? casterOp.startTime.getTime() : Infinity;
            });

            sortedHeats.forEach((heat, index) => {
                const originalHeat = validHeats.find(vh => vh.Heat_ID === heat.Heat_ID);
                if (originalHeat) {
                    originalHeat.sequenceInCaster = index + 1;
                }
            });
        }
    }

    return { validHeats, errors };
}
