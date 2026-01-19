import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
import time
import re

class NLLBTranslator:
    def __init__(self, model_name="facebook/nllb-200-distilled-600M"):
        self.device = self._get_device()
        print(f"Loading model {model_name} on {self.device}...")
        
        # Load tokenizer and model
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForSeq2SeqLM.from_pretrained(model_name).to(self.device)
        
        # Supported languages mapping
        self.lang_map = {
            "cat_Latn": "cat_Latn",
            "spa_Latn": "spa_Latn",
            "eng_Latn": "eng_Latn"
        }
        print("Model loaded successfully.")

    def _get_device(self):
        if torch.backends.mps.is_available():
            return "mps"
        elif torch.cuda.is_available():
            return "cuda"
        return "cpu"

    def _split_text(self, text, max_length=400):
        """Splits text into chunks by paragraphs or sentences to avoid cutting mid-sentence."""
        paragraphs = text.split('\n')
        chunks = []
        current_chunk = ""

        for para in paragraphs:
            if len(current_chunk) + len(para) < max_length:
                current_chunk += para + '\n'
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                
                # If a single paragraph is too long, split it by sentence
                if len(para) > max_length:
                    sentences = re.split(r'(?<=[.!?]) +', para)
                    sub_chunk = ""
                    for sent in sentences:
                        if len(sub_chunk) + len(sent) < max_length:
                            sub_chunk += sent + " "
                        else:
                            if sub_chunk:
                                chunks.append(sub_chunk.strip())
                            sub_chunk = sent + " "
                    current_chunk = sub_chunk
                else:
                    current_chunk = para + '\n'
        
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        return chunks

    def translate(self, text, src_lang, tgt_lang, max_length=512):
        if not text.strip():
            return "", 0

        start_time = time.time()
        
        # Validate languages
        if src_lang not in self.lang_map or tgt_lang not in self.lang_map:
            raise ValueError(f"Unsupported language code: {src_lang} or {tgt_lang}")

        # Split text into manageable chunks
        chunks = self._split_text(text)
        translated_chunks = []

        for chunk in chunks:
            # Set the source language for the tokenizer
            self.tokenizer.src_lang = src_lang
            inputs = self.tokenizer(chunk, return_tensors="pt").to(self.device)
            
            # Use convert_tokens_to_ids to get the target language ID
            tgt_lang_id = self.tokenizer.convert_tokens_to_ids(tgt_lang)
            
            # Generate translation
            translated_tokens = self.model.generate(
                **inputs,
                forced_bos_token_id=tgt_lang_id,
                max_length=max_length,
                num_beams=4
            )
            
            translation = self.tokenizer.batch_decode(translated_tokens, skip_special_tokens=True)[0]
            translated_chunks.append(translation)

        full_translation = " ".join(translated_chunks)
        time_ms = int((time.time() - start_time) * 1000)
        
        return full_translation, time_ms

# Singleton instance to be used by FastAPI
translator = None

def get_translator():
    global translator
    if translator is None:
        translator = NLLBTranslator()
    return translator
