# Offline NLLB Translator for macOS

This is a 100% offline translation web application powered by Meta's **NLLB-200-distilled-600M** model. It's designed for Apple Silicon (M1/M2/M3) and Intel Macs, utilizing **Metal (MPS)** for hardware acceleration.

## Features

- **Languages Support**: Catalan, Spanish, and English.
- **Offline First**: Once the model is downloaded (first run), no internet is required.
- **Hardware Acceleration**: Automatic use of macOS Metal Performance Shaders (MPS).
- **Responsive UI**: Google Translate inspired design with Dark Mode support.
- **Smart Chunking**: Handles long texts without cutting sentences.
- **Utility**: Character counter, copy to clipboard, local history, and keyboard shortcuts.

## Requirements

- Python 3.9+
- macOS (tested on Apple Silicon)
- ~3GB of free disk space (to store the model)

## Setup and Execution

1.  **Clone/Navigate to the directory**:
    ```bash
    cd /Users/coni/tmp/offline_translator
    ```

2.  **Create a Virtual Environment**:
    ```bash
    python3 -m venv .venv
    ```

3.  **Activate and Install Dependencies**:
    ```bash
    source .venv/bin/activate
    pip install -r requirements.txt
    ```

4.  **Launch the Translation Server**:
    ```bash
    python3 backend/main.py
    ```
    *Note: The first run will download the NLLB-200-600M model from Hugging Face (~1.2GB). This only happens once.*

5.  **Use the App**:
    Open your browser and navigate to:
    [http://localhost:8000](http://localhost:8000)

## Keyboard Shortcuts

- `Cmd + Enter`: Force Translation
- `Cmd + L`: Focus on Input
- `Cmd + C`: Copy Translation (when not focusing input)

## Project Structure

- `backend/`: FastAPI server and NLLB translation logic.
- `frontend/`: Web interface (HTML, CSS, JS).
- `requirements.txt`: Python dependencies.
