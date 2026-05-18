"""
OCR Processor Service
Extracts raw text from uploaded medical report files (PDFs and images).
Uses PyMuPDF for PDF-to-image conversion and pytesseract for OCR.
"""
import os
import io
import logging

logger = logging.getLogger(__name__)


class OCRProcessor:
    """
    Extracts text from uploaded report files using Tesseract OCR.
    Supports: PDF, PNG, JPG, JPEG, BMP, TIFF
    """

    def __init__(self):
        # Configure pytesseract path from Django settings
        try:
            import pytesseract
            from django.conf import settings
            tesseract_cmd = getattr(settings, 'TESSERACT_CMD', r'C:\Program Files\Tesseract-OCR\tesseract.exe')
            pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
            self.pytesseract = pytesseract
        except ImportError:
            logger.error("pytesseract is not installed. Run: pip install pytesseract")
            self.pytesseract = None

    def extract_text(self, file_path: str) -> str:
        """
        Main entry point. Accepts a file path and returns the extracted text string.
        """
        if not os.path.exists(file_path):
            logger.error(f"File not found: {file_path}")
            return ""

        ext = os.path.splitext(file_path)[1].lower()

        if ext == '.pdf':
            return self._extract_from_pdf(file_path)
        elif ext in ['.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.tif']:
            return self._extract_from_image(file_path)
        else:
            logger.warning(f"Unsupported file type: {ext}")
            return ""

    def _extract_from_pdf(self, file_path: str) -> str:
        """Converts each PDF page to an image and runs OCR on it."""
        try:
            import fitz  # PyMuPDF
            from PIL import Image

            doc = fitz.open(file_path)
            all_text = []

            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                # Render at 2x DPI for better OCR accuracy
                mat = fitz.Matrix(2, 2)
                pix = page.get_pixmap(matrix=mat)
                img_data = pix.tobytes("png")
                img = Image.open(io.BytesIO(img_data))
                text = self.pytesseract.image_to_string(img, config='--oem 3 --psm 6')
                all_text.append(text)

            doc.close()
            return "\n\n".join(all_text)

        except ImportError:
            logger.error("PyMuPDF is not installed. Run: pip install PyMuPDF")
            return ""
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {e}")
            return ""

    def _extract_from_image(self, file_path: str) -> str:
        """Runs pytesseract OCR directly on an image file."""
        try:
            from PIL import Image
            img = Image.open(file_path)
            # Use OEM 3 (LSTM) and PSM 6 (assume uniform block of text)
            text = self.pytesseract.image_to_string(img, config='--oem 3 --psm 6')
            return text
        except Exception as e:
            logger.error(f"Error extracting text from image: {e}")
            return ""
