"""
Content Extraction Service — Extract text from PDFs and images.

Features:
- PDF text extraction using PyMuPDF
- Image OCR using Gemini Vision API
- Background processing with status tracking
"""
import asyncio
import base64
import io
import logging
from typing import Optional, Tuple

import httpx

from app.core.config import settings
from app.db.connection import get_db

logger = logging.getLogger(__name__)

# Max text length to store (prevent huge extractions)
MAX_EXTRACTED_TEXT_LENGTH = 100_000  # ~100KB of text


def extract_text_from_pdf(pdf_bytes: bytes) -> Tuple[str, Optional[str]]:
    """
    Extract text from PDF bytes.
    
    Returns:
        (extracted_text, error_message)
    """
    try:
        import fitz  # PyMuPDF
        
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        text_parts = []
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text()
            if text.strip():
                text_parts.append(f"--- Page {page_num + 1} ---\n{text.strip()}")
        
        doc.close()
        
        if not text_parts:
            return "", "PDF contains no extractable text (may be scanned images)"
        
        full_text = "\n\n".join(text_parts)
        
        # Truncate if too long
        if len(full_text) > MAX_EXTRACTED_TEXT_LENGTH:
            full_text = full_text[:MAX_EXTRACTED_TEXT_LENGTH] + "\n\n[... text truncated ...]"
        
        return full_text, None
        
    except Exception as e:
        logger.error(f"PDF extraction failed: {e}")
        return "", f"PDF extraction failed: {str(e)}"


async def extract_text_from_image_gemini(image_bytes: bytes, mime_type: str) -> Tuple[str, Optional[str]]:
    """
    Extract text from image using Gemini Vision API.
    
    Returns:
        (extracted_text, error_message)
    """
    try:
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            return "", "Gemini API key not configured"
        
        # Encode image to base64
        image_b64 = base64.b64encode(image_bytes).decode('utf-8')
        
        # Prepare request for Gemini
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
        
        payload = {
            "contents": [{
                "parts": [
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": image_b64
                        }
                    },
                    {
                        "text": """Extract ALL text visible in this image. This is a study material (textbook page, notes, diagram, etc.).

Instructions:
1. Extract every piece of text you can see
2. Preserve the structure and formatting
3. For diagrams/charts, describe the content and any labels
4. For handwritten notes, do your best to transcribe
5. If there are equations or formulas, write them in plain text

Return ONLY the extracted text, no explanations."""
                    }
                ]
            }],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 8000,
            }
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, json=payload)
            
            if response.status_code != 200:
                error_data = response.json() if response.content else {}
                error_msg = error_data.get("error", {}).get("message", response.text[:200])
                return "", f"Gemini API error: {error_msg}"
            
            data = response.json()
            
            # Extract text from response
            candidates = data.get("candidates", [])
            if not candidates:
                return "", "No text extracted from image"
            
            content = candidates[0].get("content", {})
            parts = content.get("parts", [])
            
            text_parts = [p.get("text", "") for p in parts if "text" in p]
            extracted_text = "\n".join(text_parts).strip()
            
            if not extracted_text:
                return "", "Image contains no readable text"
            
            # Truncate if too long
            if len(extracted_text) > MAX_EXTRACTED_TEXT_LENGTH:
                extracted_text = extracted_text[:MAX_EXTRACTED_TEXT_LENGTH] + "\n\n[... text truncated ...]"
            
            return extracted_text, None
            
    except Exception as e:
        logger.error(f"Image OCR failed: {e}")
        return "", f"Image OCR failed: {str(e)}"


async def extract_content_from_url(file_url: str, file_type: str) -> Tuple[str, Optional[str]]:
    """
    Download file from URL and extract text.
    
    Args:
        file_url: URL of the file
        file_type: 'pdf', 'image', or 'text'
    
    Returns:
        (extracted_text, error_message)
    """
    try:
        # Download file
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(file_url)
            if response.status_code != 200:
                return "", f"Failed to download file: HTTP {response.status_code}"
            
            file_bytes = response.content
            content_type = response.headers.get("content-type", "")
        
        # Extract based on type
        if file_type == 'pdf':
            # Run PDF extraction in thread (it's sync)
            return await asyncio.to_thread(extract_text_from_pdf, file_bytes)
        
        elif file_type == 'image':
            # Determine MIME type
            if 'png' in content_type:
                mime_type = 'image/png'
            elif 'webp' in content_type:
                mime_type = 'image/webp'
            else:
                mime_type = 'image/jpeg'
            
            return await extract_text_from_image_gemini(file_bytes, mime_type)
        
        elif file_type == 'text':
            # Text files - just decode
            try:
                text = file_bytes.decode('utf-8')
            except UnicodeDecodeError:
                text = file_bytes.decode('latin-1')
            
            if len(text) > MAX_EXTRACTED_TEXT_LENGTH:
                text = text[:MAX_EXTRACTED_TEXT_LENGTH] + "\n\n[... text truncated ...]"
            
            return text, None
        
        else:
            return "", f"Unsupported file type: {file_type}"
            
    except Exception as e:
        logger.error(f"Content extraction failed: {e}")
        return "", f"Extraction failed: {str(e)}"


def update_upload_extraction_status(
    upload_id: int,
    status: str,
    extracted_text: Optional[str] = None,
    error: Optional[str] = None
):
    """Update extraction status in database."""
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE chapter_uploads
            SET extraction_status = %s,
                extracted_text = %s,
                extraction_error = %s
            WHERE id = %s
        """, (status, extracted_text, error, upload_id))
        conn.commit()
    finally:
        conn.close()


async def process_upload_extraction(upload_id: int, file_url: str, file_type: str):
    """
    Process content extraction for an upload.
    Updates the database with status and extracted content.
    """
    # Mark as processing
    update_upload_extraction_status(upload_id, 'processing')
    
    try:
        extracted_text, error = await extract_content_from_url(file_url, file_type)
        
        if error:
            update_upload_extraction_status(upload_id, 'failed', None, error)
            logger.warning(f"Extraction failed for upload {upload_id}: {error}")
        else:
            update_upload_extraction_status(upload_id, 'completed', extracted_text, None)
            logger.info(f"Extraction completed for upload {upload_id}: {len(extracted_text)} chars")
            
    except Exception as e:
        update_upload_extraction_status(upload_id, 'failed', None, str(e))
        logger.error(f"Extraction error for upload {upload_id}: {e}")


def get_chapter_extracted_content(user_id: str, chapter_id: int) -> str:
    """
    Get all extracted content for a chapter.
    Combines text from all uploads with completed extraction.
    
    Returns:
        Combined extracted text from all uploads
    """
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT name, extracted_text, file_type
            FROM chapter_uploads
            WHERE user_id = %s AND chapter_id = %s
              AND extraction_status = 'completed'
              AND extracted_text IS NOT NULL
            ORDER BY uploaded_at ASC
        """, (user_id, chapter_id))
        
        rows = cur.fetchall()
        
        if not rows:
            return ""
        
        parts = []
        for row in rows:
            name = row['name']
            text = row['extracted_text']
            file_type = row['file_type']
            
            parts.append(f"=== Source: {name} ({file_type}) ===\n{text}")
        
        return "\n\n".join(parts)
        
    finally:
        conn.close()
