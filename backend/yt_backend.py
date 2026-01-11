from langchain_huggingface import (
    ChatHuggingFace,
    HuggingFaceEndpoint,
    HuggingFaceEndpointEmbeddings
)
from dotenv import load_dotenv
import os
from youtube_transcript_api import YouTubeTranscriptApi
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.prompts import PromptTemplate
import subprocess
from pathlib import Path
import whisper
import sys



# -------------------- ENV --------------------
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

hf_token = os.getenv("HUGGINGFACEHUB_ACCESS_TOKEN")
if not hf_token:
    raise RuntimeError("HUGGINGFACEHUB_ACCESS_TOKEN not found")


# -------------------- MODELS --------------------
llm = HuggingFaceEndpoint(
    repo_id="mistralai/Mistral-7B-Instruct-v0.2",
    task="text-generation",
    huggingfacehub_api_token=hf_token
)

embedding_model = HuggingFaceEndpointEmbeddings(
    model="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
    task="feature-extraction",
    huggingfacehub_api_token=hf_token
)

chat_model = ChatHuggingFace(llm=llm)


# -------------------- WHISPER --------------------
whisper_model = None


def get_whisper_model():
    global whisper_model
    if whisper_model is None:
        whisper_model = whisper.load_model("small")
    return whisper_model


# -------------------- TRANSCRIPT --------------------
# def get_transcript(video_id: str) -> str:
#     video_url = f"https://www.youtube.com/watch?v={video_id}"
#     audio_path = Path(f"{video_id}.webm")
#     ytt = YouTubeTranscriptApi()

#     try:
#         fetched = ytt.fetch(video_id, languages=["en"])
#         return " ".join(x["text"] for x in fetched.to_raw_data())
#     except Exception:
#         pass

#     try:
#         transcript_list = ytt.list(video_id)
#         transcript = next(iter(transcript_list))

#         if transcript.is_translatable:
#             transcript = transcript.translate("en")

#         fetched = transcript.fetch()
#         return " ".join(x["text"] for x in fetched.to_raw_data())
#     except Exception:
#         pass

#     subprocess.run(
#         [
#             sys.executable,
#             "-m",
#             "yt_dlp",
#             "-f",
#             "bestaudio",
#             "-o",
#             str(audio_path),
#             video_url,
#         ],
#         check=True,
#     )

#     result = get_whisper_model().transcribe(str(audio_path))
#     if audio_path.exists():
#         audio_path.unlink()

#     return result["text"]


def get_transcript(video_id: str) -> str:
    video_url = f"https://www.youtube.com/watch?v={video_id}"
    audio_path = Path(f"{video_id}.webm")
    ytt = YouTubeTranscriptApi()

    try:
        transcript_list = ytt.list(video_id)

        for t in transcript_list:
            if t.language_code.startswith("en"):
                fetched = t.fetch()
                return " ".join(x["text"] for x in fetched.to_raw_data())

        for t in transcript_list:
            if t.is_translatable:
                fetched = t.translate("en").fetch()
                return " ".join(x["text"] for x in fetched.to_raw_data())

    except Exception as e:
        print(f"[Transcript error] {e}")


    subprocess.run(
        [
            sys.executable,
            "-m",
            "yt_dlp",
            "-f",
            "bestaudio",
            "-o",
            str(audio_path),
            video_url,
        ],
        check=True,
    )

    result = get_whisper_model().transcribe(str(audio_path))
    if audio_path.exists():
        audio_path.unlink()

    return result["text"]



# -------------------- CHUNKING --------------------
splitter = RecursiveCharacterTextSplitter(
    chunk_size=1200,
    chunk_overlap=100
)

chunks = None
compact_text = None


def set_chunks(new_chunks):
    global chunks, compact_text
    chunks = new_chunks
    compact_text = None


# -------------------- SUMMARIZATION --------------------
def summarize_in_batches(chunks, batch_size=20):
    summaries = []

    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i + batch_size]
        text = "\n\n".join(doc.page_content for doc in batch)

        res = chat_model.invoke(
            f"""
Summarize the following content by extracting key ideas,
important explanations, and conclusions.
Do not add new information.
Respond in English.

Text:
{text}
"""
        )

        summaries.append(res.content)

    return summaries


def get_compact_text():
    global compact_text, chunks

    if chunks is None:
        return ""

    if compact_text is not None:
        return compact_text

    batch_summaries = summarize_in_batches(chunks, batch_size=20)
    combined = "\n\n".join(batch_summaries)[:120_000]

    final = chat_model.invoke(
        f"""
Summarize the following content by extracting key ideas,
important explanations, and conclusions.
Do not add new information.
Respond in English.

Summaries:
{combined}
"""
    )

    compact_text = final.content
    return compact_text


# -------------------- INTENT --------------------
GLOBAL_KEYWORDS = [
    "entire", "whole", "full", "overall", "complete",
    "summary", "summarize", "overview", "big picture",
    "key points", "notes", "quiz", "mcq", "test me"
]

RETRIEVAL_KEYWORDS = [
    "what is", "why", "how", "explain", "define",
    "difference", "compare", "where", "when"
]


def detect_intent(query: str):
    q = query.lower()

    for kw in GLOBAL_KEYWORDS:
        if kw in q:
            return "GLOBAL"

    return "RETRIEVAL"




prompt = PromptTemplate(
    template="""
You are a helpful assistant.

Answer the question using ONLY the information explained
in the video. Do NOT mention transcripts, text, captions,
or documents.

If the video does not explain the answer, say:
"I don’t know based on this video."

Video explanation:
{context}

Question: {question}
""",
    input_variables=["context", "question"],
)



# -------------------- ANSWER GENERATION --------------------
def generate_answer(context: str, question: str) -> str:
    response = chat_model.invoke(
        prompt.format(
            context=context,
            question=question
        )
    )
    return response.content


def answer_with_intent(question: str, vector_store):
    intent = detect_intent(question)

    if intent == "GLOBAL":
        context = get_compact_text()
    else:
        retriever = vector_store.as_retriever(
            search_type="mmr",
            search_kwargs={"k": 5,
                           "fetch_k": 20,
                           "lambda_mult": 0.5
                           }
        )
        docs = retriever.invoke(question)
        context = "\n\n".join(d.page_content for d in docs)

    return generate_answer(context, question)
