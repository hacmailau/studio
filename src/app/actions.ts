
'use server';

import { processRows } from '@/lib/excel-parser';
import { parseGoogleSheet } from '@/lib/google-sheet-parser';
import { validateAndTransform } from '@/lib/validator';
import * as XLSX from 'xlsx';

export async function uploadHeatsAction(formData: FormData) {
  const file = formData.get('file') as File;

  if (!file) {
    return { success: false, error: 'Không tìm thấy tệp.' };
  }

  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      blankrows: false,
      defval: null,
      raw: false, // Ensure dates/times are formatted as strings
    });

    const { rows, warnings: parseWarnings } = processRows(json as any[][]);
    const { validHeats, errors: validationErrs } = validateAndTransform(rows);

    const allErrors = validationErrs.filter(e => e.kind !== 'PLACEHOLDER' && e.kind !== 'UNIT');
    const allWarnings = [...parseWarnings, ...validationErrs.filter(e => e.kind === 'PLACEHOLDER' || e.kind === 'UNIT')];

    // This part would previously save to a DB. Now we return the data to the client.
    // This is a significant architectural decision. For simplicity, we are processing in server action and returning to client.
    // In a DB-backed scenario, this would be: await heatService.upsertHeats(validHeats);

    return {
      success: true,
      data: {
        ganttData: validHeats,
        validationErrors: allErrors,
        warnings: allWarnings,
        previewData: rows.slice(0, 20),
        cleanJson: rows
      },
    };
  } catch (e: any) {
    console.error('Server Action Error:', e);
    return { success: false, error: e.message };
  }
}

export async function processGoogleSheetAction(sheetUrl: string) {
    if (!sheetUrl) {
        return { success: false, error: 'Vui lòng cung cấp URL của Google Sheet.' };
    }

    try {
        const { rows, warnings: parseWarnings } = await parseGoogleSheet(sheetUrl);
        const { validHeats, errors: validationErrs } = validateAndTransform(rows);
        
        const allErrors = validationErrs.filter(e => e.kind !== 'PLACEHOLDER' && e.kind !== 'UNIT');
        const allWarnings = [...parseWarnings, ...validationErrs.filter(e => e.kind === 'PLACEHOLDER' || e.kind === 'UNIT')];

        return {
            success: true,
            data: {
                ganttData: validHeats,
                validationErrors: allErrors,
                warnings: allWarnings,
                previewData: rows.slice(0, 20),
                cleanJson: rows,
            },
        };

    } catch (e: any) {
        console.error('Google Sheet Processing Error:', e);
        return { success: false, error: e.message };
    }
}
