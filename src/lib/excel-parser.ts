
import * as XLSX from "xlsx";
import type { ExcelRow, ValidationError } from "./types";

// Standardized keys we expect.
// The key is the normalized version of the header (lowercase, no spaces/special chars).
// The value is the property name in our ExcelRow object.
const MAPPING: Record<string, keyof ExcelRow> = {
    // Vietnamese variants
    ngay: "dateStr",
    thoigian: "dateStr",
    methep: "heatId",
    macthep: "steelGrade",
    congdoan: "unit",
    thoigianbatdau: "startStr",
    thoigianketthuc: "endStr",
    seq: "seqNum",
    
    // English variants
    date: "dateStr",
    heatid: "heatId",
    heat_id: "heatId",
    steelgrade: "steelGrade",
    steel_grade: "steelGrade",
    unit: "unit",
    starttime: "startStr",
    start_time: "startStr",
    endtime: "endStr",
    end_time: "endStr",
    sequencenumber: "seqNum",
    sequence_number: "seqNum",
};

const REQUIRED_KEYS: (keyof ExcelRow)[] = ["heatId", "steelGrade", "unit", "startStr", "endStr"];

// A more robust normalization function
const normalizeHeader = (header: string): string => {
    if (!header) return "";
    return header
        .toLowerCase()
        .normalize("NFD") // Decompose accented characters
        .replace(/[\u0300-\u036f]/g, "") // Remove diacritical marks
        .replace(/đ/g, "d") // Special case for Vietnamese 'đ'
        .replace(/\s+/g, '') // Remove spaces
        .replace(/_/g, ''); // Remove underscores
};

function formatValue(value: any): string {
    if (value === null || value === undefined) {
        return "";
    }
    // All values from google-spreadsheet and xlsx (with raw: false) should be strings
    return String(value).trim();
}


/**
 * Parses raw rows (from either Excel or CSV) into structured ExcelRow objects.
 * @param rows The raw data as an array of 2D array.
 * @returns An object containing parsed rows and any warnings.
 */
export function processRows(rows: any[][]): { rows: ExcelRow[], warnings: ValidationError[] } {
    if (rows.length < 2) {
        throw new Error("Sheet trống hoặc không có dữ liệu.");
    }

    const rawHeaders = rows[0].map(h => String(h || ''));
    const normalizedHeaders = rawHeaders.map(normalizeHeader);
    
    // Map of the column index to the ExcelRow key
    const headerMap: Record<number, keyof ExcelRow> = {};
    // Set of found keys to check for required ones
    const foundKeys = new Set<keyof ExcelRow>();

    normalizedHeaders.forEach((normHeader, index) => {
        const mappedKey = MAPPING[normHeader];
        if (mappedKey) {
            // Prevent mapping the same key twice (e.g. 'Date' and 'Time' both mapping to 'dateStr')
            if (!Object.values(headerMap).includes(mappedKey) || mappedKey === 'dateStr') {
                 headerMap[index] = mappedKey;
            }
            foundKeys.add(mappedKey);
        }
    });

    const missingKeys = REQUIRED_KEYS.filter(key => !foundKeys.has(key));
    if (missingKeys.length > 0) {
         throw new Error(`Thiếu các cột bắt buộc: ${missingKeys.join(', ')}. Vui lòng kiểm tra lại tiêu đề cột.`);
    }

    const dataRows = rows.slice(1);
    const parsedRows: ExcelRow[] = [];
    const warnings: ValidationError[] = [];

    dataRows.forEach((rowData, index) => {
        if (rowData.every(cell => cell === null || cell === '' || cell === undefined)) {
            return; // Skip completely empty row
        }

        const excelRow: Partial<ExcelRow> = { rawIndex: index + 2 }; // +2 because of header and 1-based index

        Object.entries(headerMap).forEach(([colIndex, key]) => {
            const cellValue = rowData[Number(colIndex)];
            const formattedValue = formatValue(cellValue);
            
            // Special handling to merge date and time if they are in separate columns
            if (key === 'dateStr' && excelRow[key] && formattedValue) {
                 // If dateStr already has a value, it might be a date. If the new value is a time, append it.
                if (formattedValue.includes(':')) {
                    excelRow[key] = `${excelRow[key]} ${formattedValue}`;
                } else { // if the new value is a date, it's ambiguous. Let's just take the new one for now.
                    excelRow[key] = formattedValue;
                }
            } else {
                (excelRow as any)[key] = formattedValue;
            }
        });
        
        const finalRow = excelRow as ExcelRow;
        
        // Filter out placeholder rows
        if (finalRow.unit === '0' || (finalRow.startStr === '00:00' && finalRow.endStr === '00:00')) {
            warnings.push({
                heat_id: finalRow.heatId || `Hàng ${finalRow.rawIndex}`,
                kind: 'PLACEHOLDER',
                message: `Bỏ qua hàng giữ chỗ (Unit='0' hoặc thời gian 0:00).`,
            });
            return;
        }
        
        // Validate time format - now it can be part of a date-time string
        const timeRegex = /\d{1,2}:\d{2}/;
        if ((finalRow.startStr && !timeRegex.test(finalRow.startStr)) || (finalRow.endStr && !timeRegex.test(finalRow.endStr))) {
             warnings.push({
                heat_id: finalRow.heatId || `Hàng ${finalRow.rawIndex}`,
                kind: 'FORMAT',
                message: `Định dạng thời gian không hợp lệ ở hàng ${finalRow.rawIndex}. Giá trị: '${finalRow.startStr}' / '${finalRow.endStr}'`,
            });
            return;
        }

        if(finalRow.seqNum) {
            finalRow.seqNum = Number(finalRow.seqNum);
        }

        parsedRows.push(finalRow);
    });

    return { rows: parsedRows, warnings };
}


/**
 * Parses an Excel or CSV file into a clean list of ExcelRow objects.
 * This function is designed for client-side use with FileReader.
 * @param file The file to parse.
 * @returns A promise that resolves with the parsed data and any initial parsing warnings.
 */
export async function parseExcel(file: File): Promise<{ rows: ExcelRow[], warnings: ValidationError[] }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (event) => {
            try {
                if (!event.target?.result) {
                    throw new Error("Không thể đọc được tệp.");
                }
                const data = event.target.result;
                const workbook = XLSX.read(data, { 
                    type: "array", 
                    cellDates: true, // Keep this for now, but we will rely on text formatting
                });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { 
                    header: 1, 
                    blankrows: false, 
                    defval: null,
                    raw: false, // Important: formats dates and times as strings
                });
                
                resolve(processRows(json as any[][]));

            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);

        reader.readAsArrayBuffer(file);
    });
}
