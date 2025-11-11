
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import type { ExcelRow, ValidationError } from './types';
import { processRows } from './excel-parser';

function getSheetIdFromUrl(url: string): string | null {
    const match = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/.exec(url);
    return match ? match[1] : null;
}


export async function parseGoogleSheet(url: string): Promise<{ rows: ExcelRow[], warnings: ValidationError[] }> {
    const sheetId = getSheetIdFromUrl(url);
    if (!sheetId) {
        throw new Error("URL Google Sheet không hợp lệ.");
    }

    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;

    if (!serviceAccountEmail || !privateKey) {
        throw new Error("Thiếu thông tin xác thực Google Service Account. Vui lòng kiểm tra tệp .env.local.");
    }

    const jwt = new JWT({
        email: serviceAccountEmail,
        key: privateKey.replace(/\\n/g, '\n'), // Important for Vercel/Netlify env vars
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(sheetId, jwt);
    
    await doc.loadInfo(); 
    const sheet = doc.sheetsByIndex[0]; // Get the first sheet
    
    // Get all values, which returns a 2D array
    const rawRows = await sheet.getValues();

    if (!rawRows || rawRows.length < 2) {
        throw new Error("Sheet trống hoặc không có dữ liệu.");
    }
    
    // The processRows function expects a similar structure
    return processRows(rawRows);
}
