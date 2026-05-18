"""
Medical Analyzer Service
Uses Google Gemini AI (Multimodal) and pdfplumber to parse medical reports.
Direct vision + structured table extraction provides maximum accuracy.
"""
import json
import logging
import re
import os
from services.pdf_table_extractor import PDFTableExtractor

logger = logging.getLogger(__name__)

"""
Medical Analyzer Service
Uses Google Gemini AI (Multimodal) and pdfplumber to parse medical reports.
Direct vision + structured table extraction provides maximum accuracy.
"""
import json
import logging
import re
import os
import traceback
from dotenv import load_dotenv
from django.conf import settings
from services.pdf_table_extractor import PDFTableExtractor

logger = logging.getLogger(__name__)

EXTRACTION_PROMPT = """
You are an expert medical data extraction and analysis AI. You will receive data from a medical lab report.
The data may include an image, raw OCR text, or structured table data extracted from a PDF.

Your CRITICAL tasks:
1. Extract ALL medical lab parameters (e.g., Hemoglobin, WBC, Glucose, etc).
2. For each parameter, find the EXACT:
   - Result Value (numeric or text)
   - Unit (e.g., g/dL, mg/dL, 10^3/uL)
   - Normal/Reference Range (e.g., 13.5-17.5)
3. Correctly classify each parameter's "Status":
   - "Normal": Value is within the reference range.
   - "Borderline": Value is slightly outside the reference range.
   - "Critical": Value is significantly/dangerously outside the reference range.
4. Provide a non-technical, simple "Explanation" for each parameter, telling the patient what it means in plain English (e.g., "A protein in red blood cells that carries oxygen. Low levels can cause fatigue.").
5. Overall Status: Determine if the entire report is "Normal", "Borderline", or "Critical" based on the worst parameter result.
6. Plain English Summary: Provide an overall AI health summary and simplification of findings in simple terms.

Return ONLY valid JSON with this exact structure (no markdown, no code fences):
{
  "title": "string (e.g. 'Complete Blood Count')",
  "type": "Blood",
  "abnormality": "Normal",
  "summary": "string (brief summary of findings and overall advice)",
  "lab_values": [
    {
      "parameter": "Hemoglobin",
      "value": "14.2",
      "unit": "g/dL",
      "range": "13.8-17.2",
      "status": "Normal",
      "explanation": "A protein in red blood cells that carries oxygen from your lungs to the rest of your body."
    }
  ]
}

If no parameters are found, return:
{"title": "Medical Report", "type": "Discharge", "abnormality": "Normal", "summary": "No structured parameters could be extracted.", "lab_values": []}
"""

class MedicalAnalyzer:
    """
    Parses medical reports using Gemini Multimodal Vision and pdfplumber
    for structured table data extraction. Supports self-healing dual SDK configurations.
    """

    def __init__(self):
        self.client = None
        self.ai_available = False
        self.sdk_type = None  # 'modern' or 'legacy'
        self.init_error = None
        
        try:
            # Force reloading of .env using absolute path base directory from settings
            dotenv_path = os.path.join(settings.BASE_DIR, '.env')
            load_dotenv(dotenv_path, override=True)
            
            api_key = getattr(settings, 'GEMINI_API_KEY', '') or os.environ.get('GEMINI_API_KEY', '')
            
            # Print a safe, diagnostic log of the API key
            if api_key:
                masked_key = f"{api_key[:6]}...{api_key[-4:]}" if len(api_key) > 10 else "invalid-length"
                logger.info(f"Loaded GEMINI_API_KEY from environment: {masked_key} (length: {len(api_key)})")
            else:
                logger.warning("GEMINI_API_KEY was not found during initialization.")

            if not api_key:
                self.init_error = "GEMINI_API_KEY is completely missing from environment and settings."
                logger.error(self.init_error)
                return

            # Try Modern google-genai Client
            try:
                from google import genai
                self.client = genai.Client(api_key=api_key)
                self.sdk_type = 'modern'
                self.ai_available = True
                logger.info("Modern Google GenAI client successfully initialized.")
            except ImportError as e:
                # Fallback to Legacy google-generativeai client
                try:
                    import google.generativeai as legacy_genai
                    legacy_genai.configure(api_key=api_key)
                    self.client = legacy_genai.GenerativeModel('gemini-1.5-flash')
                    self.sdk_type = 'legacy'
                    self.ai_available = True
                    logger.info("Legacy google-generativeai client successfully initialized.")
                except ImportError as e2:
                    self.init_error = f"Neither google-genai (Error: {e}) nor google-generativeai (Error: {e2}) libraries are installed!"
                    logger.error(self.init_error)
        except Exception as e:
            self.init_error = f"General failure during initialization: {str(e)}"
            logger.error(f"Error initializing Gemini client: {e}\n{traceback.format_exc()}")

    def analyze_report(self, ocr_text: str = "", file_path: str = None) -> dict:
        """
        Main entry point. Uses structured table extraction for PDFs,
        and Multimodal Vision for images.
        """
        logger.info(f"analyze_report called. AI available: {self.ai_available} ({self.sdk_type}). File path: {file_path}")
        
        if not self.ai_available:
            err_msg = self.init_error or "AI model client is not initialized."
            return self._analyze_with_regex(ocr_text, f"AI initialization failed: {err_msg}")

        structured_data = ""
        is_pdf = file_path and file_path.lower().endswith('.pdf')

        # Step 1: Try Structured Table Extraction for PDFs
        if is_pdf:
            logger.info("Extracting structured table data from PDF...")
            try:
                table_extractor = PDFTableExtractor()
                structured_data = table_extractor.extract_structured_data(file_path)
                if structured_data:
                    logger.info("Structured PDF data extracted.")
            except Exception as e:
                logger.error(f"Structured PDF extraction failed: {e}\n{traceback.format_exc()}")

        # Step 2: Run Gemini Analysis
        try:
            contents = [EXTRACTION_PROMPT]
            
            # Add structured text if we have it
            if structured_data:
                contents.append(f"STRUCTURED TABLE DATA:\n{structured_data}")
            
            # Add raw OCR text as fallback context
            if ocr_text:
                contents.append(f"RAW OCR TEXT:\n{ocr_text[:5000]}")

            # Modern google-genai generation
            if self.sdk_type == 'modern':
                from google.genai import types
                
                # Add Image/PDF Vision Part
                if file_path and os.path.exists(file_path):
                    with open(file_path, 'rb') as f:
                        file_bytes = f.read()
                    
                    ext = os.path.splitext(file_path)[1].lower()
                    mime_type = "application/pdf" if ext == ".pdf" else f"image/{ext.replace('.', '')}"
                    if mime_type == "image/jpg": mime_type = "image/jpeg"
                    
                    contents.append(types.Part.from_bytes(data=file_bytes, mime_type=mime_type))

                logger.info("Dispatching generate_content request using modern google-genai SDK.")
                response = self.client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=contents
                )
                raw_response = response.text

            # Legacy google-generativeai generation
            else:
                # For legacy, we pass the image/pdf using PIL or direct bytes
                if file_path and os.path.exists(file_path) and not is_pdf:
                    from PIL import Image
                    try:
                        img = Image.open(file_path)
                        contents.append(img)
                    except Exception as e:
                        logger.error(f"Failed to open image for legacy model: {e}")

                logger.info("Dispatching generate_content request using legacy google-generativeai SDK.")
                response = self.client.generate_content(contents)
                raw_response = response.text
            
            result = self._parse_json_response(raw_response)
            if result and result.get('lab_values'):
                logger.info("Successfully received structured medical parameters from Gemini.")
                return result
            else:
                logger.warning(f"Gemini responded, but output JSON was invalid or empty: {raw_response}")
                return self._analyze_with_regex(ocr_text, "Gemini output JSON schema mismatch.")
            
        except Exception as e:
            err_trace = traceback.format_exc()
            logger.error(f"Gemini analysis request completely failed: {e}\n{err_trace}")
            return self._analyze_with_regex(ocr_text, f"AI generation request failed: {str(e)}")

    def _parse_json_response(self, raw_text: str) -> dict | None:
        try:
            raw = raw_text.strip()
            raw = re.sub(r'^```(?:json)?\s*', '', raw)
            raw = re.sub(r'\s*```$', '', raw)
            return json.loads(raw)
        except Exception as e:
            logger.error(f"JSON Parse error: {e}")
            return None

    def _analyze_with_regex(self, ocr_text: str, failure_reason: str = "AI analysis failed") -> dict:
        """Basic regex fallback if AI fails."""
        lab_values = []
        pattern = re.compile(
            r'([A-Za-z][A-Za-z\s\-/()]{2,40}?)\s+[:.-]?\s*'
            r'(\d+\.?\d*)\s*'
            r'([A-Za-z/%μ]+(?:/[A-Za-z]+)?)\s*'
            r'([\d.]+[-–][\d.]+)?',
            re.MULTILINE
        )
        for match in pattern.finditer(ocr_text):
            param, value, unit, ref_range = match.groups()
            lab_values.append({
                "parameter": param.strip(),
                "value": value,
                "unit": unit,
                "range": ref_range or "N/A",
                "status": "Normal",
                "explanation": "No explanation available (Fallback Regex Mode)."
            })

        return {
            "title": "Medical Report (Fallback)",
            "type": "Blood",
            "abnormality": "Normal",
            "summary": f"Extracted {len(lab_values)} parameters via basic OCR fallback. AI Failure Reason: {failure_reason}",
            "lab_values": lab_values[:30]
        }


