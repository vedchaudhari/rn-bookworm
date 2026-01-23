import pdfParse from 'pdf-parse';
import fs from 'fs';

/**
 * Chapter data structure returned by parsers
 */
export interface ChapterData {
    number: number;
    title: string;
    content: string;
}

/**
 * Parse TXT file and auto-detect chapters
 */
export async function parseTXT(text: string): Promise<ChapterData[]> {
    const chapters: ChapterData[] = [];

    // Multiple chapter detection patterns (ordered by specificity)
    const patterns = [
        // Standard formats
        { regex: /^Chapter\s+(\d+)\s*:?\s*(.*)$/gmi, type: 'chapter_number' },
        { regex: /^CHAPTER\s+(\d+)\s*:?\s*(.*)$/gmi, type: 'chapter_caps' },
        { regex: /^Ch\.\s*(\d+)\s*:?\s*(.*)$/gmi, type: 'ch_abbrev' },
        { regex: /^Ch\s+(\d+)\s*:?\s*(.*)$/gmi, type: 'ch_space' },

        // Roman numerals
        { regex: /^Chapter\s+([IVXLCDM]+)\s*:?\s*(.*)$/gmi, type: 'roman' },

        // Just numbers
        { regex: /^(\d+)\.\s+(.*)$/gm, type: 'number_dot' },

        // Part/Section
        { regex: /^Part\s+(\d+)\s*:?\s*(.*)$/gmi, type: 'part' },
    ];

    let bestMatch: { regex: RegExp; matches: RegExpMatchArray[]; type: string } | null = null;
    let maxMatches = 0;

    // Find the pattern with most matches
    for (const pattern of patterns) {
        const matches = [...text.matchAll(pattern.regex)];
        if (matches.length > maxMatches) {
            maxMatches = matches.length;
            bestMatch = { regex: pattern.regex, matches, type: pattern.type };
        }
    }

    if (bestMatch && bestMatch.matches.length >= 2) {
        // Use detected pattern
        for (let i = 0; i < bestMatch.matches.length; i++) {
            const match = bestMatch.matches[i];
            const nextMatch = bestMatch.matches[i + 1];

            const startIndex = match.index!;
            const endIndex = nextMatch ? nextMatch.index! : text.length;

            const chapterContent = text.substring(startIndex, endIndex).trim();

            // Remove the chapter heading from content
            const contentWithoutHeading = chapterContent.substring(match[0].length).trim();

            chapters.push({
                number: i + 1,
                title: match[2]?.trim() || `Chapter ${i + 1}`,
                content: contentWithoutHeading
            });
        }
    } else {
        // Fallback: Split by separator markers
        const separators = [
            { pattern: /\n\*\*\*+\n/g, name: 'asterisks' },
            { pattern: /\n---+\n/g, name: 'dashes' },
            { pattern: /\n===+\n/g, name: 'equals' },
            { pattern: /\n###\n/g, name: 'hashes' },
        ];

        let sections: string[] = [];
        for (const sep of separators) {
            sections = text.split(sep.pattern);
            if (sections.length > 1) break;
        }

        if (sections.length <= 1) {
            // Last resort: split by double line breaks if text is very long
            if (text.length > 50000) {
                // Split into roughly equal chunks
                const chunkSize = Math.ceil(text.length / Math.ceil(text.length / 10000));
                const words = text.split(/\n\n+/);
                let currentChunk = '';
                let chunkCount = 0;

                for (const word of words) {
                    if (currentChunk.length + word.length > chunkSize && currentChunk.length > 0) {
                        sections.push(currentChunk.trim());
                        currentChunk = word;
                        chunkCount++;
                    } else {
                        currentChunk += (currentChunk ? '\n\n' : '') + word;
                    }
                }
                if (currentChunk) sections.push(currentChunk.trim());
            } else {
                // Single chapter
                sections = [text];
            }
        }

        sections.forEach((section, index) => {
            if (section.trim()) {
                chapters.push({
                    number: index + 1,
                    title: `Chapter ${index + 1}`,
                    content: section.trim()
                });
            }
        });
    }

    return chapters.filter(ch => ch.content.length > 100); // Filter out very short chapters
}

/**
 * Parse PDF file and extract text, then apply TXT parsing
 */
export async function parsePDF(filePath: string): Promise<ChapterData[]> {
    try {
        const dataBuffer = await fs.promises.readFile(filePath);
        const pdfData = await pdfParse(dataBuffer);

        // Extract text and apply TXT parsing logic
        return parseTXT(pdfData.text);
    } catch (error) {
        console.error('Error parsing PDF:', error);
        throw new Error('Failed to parse PDF file');
    }
}

/**
 * Convert Roman numerals to numbers
 */
function romanToInt(roman: string): number {
    const romanMap: { [key: string]: number } = {
        'I': 1, 'V': 5, 'X': 10, 'L': 50,
        'C': 100, 'D': 500, 'M': 1000
    };

    let result = 0;
    for (let i = 0; i < roman.length; i++) {
        const current = romanMap[roman[i]];
        const next = romanMap[roman[i + 1]];

        if (next && current < next) {
            result -= current;
        } else {
            result += current;
        }
    }
    return result;
}

/**
 * Validate and sanitize chapter content
 */
export function sanitizeChapterContent(content: string): string {
    // Remove excessive whitespace
    content = content.replace(/\n{4,}/g, '\n\n\n');

    // Remove page numbers (common pattern: [Page X])
    content = content.replace(/\[Page \d+\]/gi, '');

    // Remove common PDF artifacts
    content = content.replace(/\f/g, ''); // Form feed

    // Trim each line
    content = content.split('\n').map(line => line.trim()).join('\n');

    return content.trim();
}

/**
 * Estimate reading time based on word count
 */
export function calculateReadingTime(content: string, wordsPerMinute: number = 200): number {
    const words = content.trim().split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
}

/**
 * Count words in content
 */
export function countWords(content: string): number {
    return content.trim().split(/\s+/).length;
}
