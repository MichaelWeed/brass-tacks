from fastapi import FastAPI, UploadFile, File, HTTPException
from docling.document_converter import DocumentConverter
from tempfile import NamedTemporaryFile
import os

app = FastAPI(title="Brass Tacks Parser Service")
converter = DocumentConverter()

@app.post("/parse")
async def parse_document(file: UploadFile = File(...)):
    # Validate extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".pdf", ".docx", ".txt", ".md"]:
        raise HTTPException(status_code=400, detail="Unsupported file format")
    
    with NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
        
    try:
        result = converter.convert(tmp_path)
        return {
            "markdown": result.document.export_to_markdown(),
            "tables": [table.to_dict() for table in result.document.tables]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parsing failed: {str(e)}")
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

@app.get("/health")
async def health():
    return {"status": "ok"}
