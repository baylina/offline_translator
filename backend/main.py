import sys
import os

# Auto-activate virtual environment if not already running from it
venv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".venv"))
venv_python = os.path.join(venv_path, "bin", "python3")

if os.path.exists(venv_python) and sys.executable != venv_python:
    os.execv(venv_python, [venv_python] + sys.argv)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn
import os
from contextlib import asynccontextmanager
from translate import get_translator

# Define request/response models
class TranslationRequest(BaseModel):
    text: str
    src_lang: str
    tgt_lang: str

class TranslationResponse(BaseModel):
    translated_text: str
    time_ms: int

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize the translator on startup
    print("Pre-loading translator model...")
    get_translator()
    yield

app = FastAPI(lifespan=lifespan)

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Translation endpoint
@app.post("/translate", response_model=TranslationResponse)
async def translate(request: TranslationRequest):
    try:
        translator = get_translator()
        translated_text, time_ms = translator.translate(
            request.text, 
            request.src_lang, 
            request.tgt_lang
        )
        return TranslationResponse(translated_text=translated_text, time_ms=time_ms)
    except Exception as e:
        print(f"Translation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Mount frontend static files
# Make sure the frontend folder exists
frontend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
else:
    print(f"Warning: Frontend directory not found at {frontend_path}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
