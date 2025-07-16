
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import re
import requests
import json
import os
from dotenv import load_dotenv

app = FastAPI()

# Load environment variables from .env file
load_dotenv()
API_KEY = os.getenv("API_KEY")

# URL for Gemini 2.0 Flash
url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={API_KEY}"

# Request headers
headers = {
    "Content-Type": "application/json"
}

class ChatRequest(BaseModel):
    user: str
    lang: str
    code: str
    error: str = None

class ChatRegen(BaseModel):
    error: str
    code: str
    language: str

# Add CORS middleware
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Allow these origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

def clean_llm_response(text: str) -> str:
    cleaned = re.sub(r"```[a-zA-Z]*\n?", "", text)  # remove ```python or ```cpp
    cleaned = cleaned.replace("```", "")  # remove leftover ```
    return cleaned.strip()


def parse_response(response_text: str):
    lang_match = re.search(r"\[Language\]:\s*(.*)", response_text)
    chat_match = re.search(r"\[Chat\]:\s*(.*)", response_text)
    code_match = re.search(r"\[Code\]:\s*([\s\S]*)", response_text)

    return {
        "language": lang_match.group(1).strip() if lang_match else None,
        "chat": chat_match.group(1).strip() if chat_match else None,
        "fixed_code": code_match.group(1).strip() if code_match else None,
    }

@app.post("/chat/")
def chat(request: ChatRequest):
    try:
        response = requests.post(url, headers=headers, data=json.dumps({
            "contents": [
                {
                    "parts": [
                        {
                            "text": f"""
                            You are a helpful coding assistant.

                            The user has asked a question related to some code. Please:
                            1. Detect the appropriate programming language from user input (ignore the "Programming Language" field if the user mentions a language).
                            2. Fix the code and return only the corrected version.
                            3. Provide a helpful assistant-style explanation (like "Here's your fixed binary search implementation").
                            4. Clearly identify what programming language you used.

                            ### User Input:
                            {request.user}

                            ### Programming Language (fallback if not in user input):
                            {request.lang}

                            ### Code:
                            {request.code}

                            ### Error (if any):
                            {request.error if request.error else "No error provided."}

                            Respond strictly in this format:

                            [Language]: <detected_language_lowercase>
                            [Chat]: <assistant style message>
                            [Code]: <fixed code (no backticks, no markdown)>
                            """
                        }
                    ]
                }
            ]
        }))

        response_json = response.json()
        if "candidates" not in response_json:
            raise HTTPException(status_code=500, detail=f"Invalid response from Gemini: {response_json}")

        full_text = response.json()["candidates"][0]["content"]["parts"][0]["text"]
        result = parse_response(full_text)

        return {
            "language": result["language"],
            "chat": result["chat"],
            "fixed_code": clean_llm_response(result["fixed_code"])
        }
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=f"Error querying chatbot: {e}")

    
@app.post("/regen/")
def regen(request: ChatRegen):
    try:
        response = requests.post(url, headers=headers, data=json.dumps({
        "contents": [
                {
                    "parts": [
                        {
                            "text": f"""
                            Fix the following code by resolving the error mentioned below.
                            Return only the fixed code as plain text. **Do not include code fences**, markdown formatting, or language tags.
                            Just plain, fixed code. No extra formatting.

                            ### Programming Language:
                            {request.language}

                            ### Error:
                            {request.error}

                            ### Code:
                            {request.code}
                            """
                        }
                    ]
                }
            ]
        }))

        llm_response = response.json()["candidates"][0]["content"]["parts"][0]["text"]
        return {"response": clean_llm_response(llm_response)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error querying chatbot: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
