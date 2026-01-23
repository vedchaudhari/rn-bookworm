// Type definitions for pdf-parse
declare module 'pdf-parse' {
    interface PDFInfo {
        PDFFormatVersion: string;
        IsAcroFormPresent: boolean;
        IsXFAPresent: boolean;
        Title?: string;
        Author?: string;
        Subject?: string;
        Creator?: string;
        Producer?: string;
        CreationDate?: string;
        ModDate?: string;
        [key: string]: any;
    }

    interface PDFMetadata {
        _metadata?: any;
        [key: string]: any;
    }

    interface PDFData {
        numpages: number;
        numrender: number;
        info: PDFInfo;
        metadata: PDFMetadata | null;
        text: string;
        version: string;
    }

    interface PDFParseOptions {
        pagerender?: (pageData: any) => string;
        max?: number;
        version?: string;
    }

    function pdfParse(
        dataBuffer: Buffer,
        options?: PDFParseOptions
    ): Promise<PDFData>;

    export = pdfParse;
}
