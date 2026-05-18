"""
PDF Table Extractor Service
Uses pdfplumber to extract structured table data from medical PDFs.
This bypasses OCR errors by directly reading the document's layout.
"""
import pdfplumber
import logging
import re

logger = logging.getLogger(__name__)

class PDFTableExtractor:
    """
    Extracts structured tables from PDF files and converts them to a
    text format that is easy for the AI to parse.
    """

    def extract_structured_data(self, file_path: str) -> str:
        """
        Extracts tables from the PDF and returns them as formatted markdown-like text.
        """
        structured_text = []
        try:
            with pdfplumber.open(file_path) as pdf:
                for i, page in enumerate(pdf.pages):
                    # Extract tables
                    tables = page.extract_tables()
                    if tables:
                        structured_text.append(f"--- PAGE {i+1} TABLES ---")
                        for table in tables:
                            # Filter out empty rows/cols and format as markdown
                            formatted_table = self._format_table(table)
                            if formatted_table:
                                structured_text.append(formatted_table)
                    
                    # Also extract regular text to preserve context (names, dates, etc)
                    text = page.extract_text()
                    if text:
                        structured_text.append(f"--- PAGE {i+1} TEXT ---")
                        structured_text.append(text)
            
            return "\n\n".join(structured_text)
        except Exception as e:
            logger.error(f"pdfplumber extraction failed: {e}")
            return ""

    def _format_table(self, table: list) -> str:
        """Converts a raw list of lists into a readable text table."""
        if not table:
            return ""
        
        output = []
        for row in table:
            # Clean row: remove None, newlines, and extra spaces
            clean_row = [str(cell).replace('\n', ' ').strip() if cell else "" for cell in row]
            # Skip rows that are entirely empty or just headers/noise
            if not any(clean_row):
                continue
            output.append(" | ".join(clean_row))
        
        return "\n".join(output) if output else ""

    def identify_lab_rows(self, text: str) -> list:
        """
        Heuristic to identify rows that look like lab results.
        Useful for cleaning noise before AI analysis.
        """
        lines = text.split('\n')
        lab_rows = []
        # Pattern for: <Name> | <Value> | <Unit> | <Range>
        # Value is usually numeric
        for line in lines:
            if '|' in line:
                # Count parts
                parts = line.split('|')
                if len(parts) >= 2:
                    # Check if any part is a number (the value)
                    if any(re.search(r'\d', part) for part in parts):
                        lab_rows.append(line)
        return lab_rows
