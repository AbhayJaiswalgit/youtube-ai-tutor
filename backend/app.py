from fastapi import FastAPI, Request
from langchain_community.vectorstores import FAISS
import os
from fastapi.middleware.cors import CORSMiddleware

os.environ["TRANSFORMERS_CACHE"] = "/tmp"

from yt_backend import (
    get_transcript,
    splitter,
    embedding_model,
    set_chunks,
    answer_with_intent
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],  
)

vector_store = None


@app.post("/load_video")
async def load_video(request: Request):
    global vector_store

    data = await request.json()
    url = data.get("url")

    if not url:
        return {"error": "URL not provided"}

    video_id = url.split("v=")[-1].split("&")[0]

    transcript = get_transcript(video_id)
    chunks = splitter.create_documents([transcript])

    set_chunks(chunks)  # 🔑 makes GLOBAL intent possible
    vector_store = FAISS.from_documents(chunks, embedding_model)

    return {"status": "Video processed successfully"}


@app.post("/ask")
async def ask_question(request: Request):
    if vector_store is None:
        return {"answer": "Please load a video first."}

    data = await request.json()
    question = data.get("question")

    if not question:
        return {"answer": "Question not provided"}

    answer = answer_with_intent(question, vector_store)
    return {"answer": answer}
