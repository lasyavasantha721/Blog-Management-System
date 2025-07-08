import os
import asyncio
from fastapi import FastAPI, HTTPException, APIRouter
from pydantic import BaseModel
from typing import Optional
from openai import OpenAI
from typing import Dict

router = APIRouter(prefix="/ai", tags=["AI Tools"])
# Configure the HF-OpenAI client
client = OpenAI(
    base_url="https://router.huggingface.co/nebius/v1",
    api_key=os.environ["HF_API_KEY"],
)

class TitleInput(BaseModel):
    title: str
    content: Optional[str] = None  # ← optional content

class SuggestOut(BaseModel):
    suggestions: str

@router.post("/suggest_outlines", response_model=SuggestOut)
async def suggest_content(data: TitleInput) -> SuggestOut:
    prompt = (
        "You are a creative blog strategist. A user will give you a rough working title or article idea, "
        "and optionally, the article's content. Your task is to create four high-quality blog post title suggestions.\n\n"
        "Instructions:\n"
        "• Even if the phrasing is unclear, infer what the article is about.\n"
        "• If content is provided, use it to understand the user’s intent and tone more deeply.\n"
        "• Each title should feel vivid, benefit-driven, and descriptive—like a headline readers will want to click.\n"
        "• Each title should have a minimum of **10 words** or about **80+ characters**.\n"
        "• Balance clarity and creativity with blog-friendly appeal. Avoid short, generic titles.  \n"
        "• For style reference, mimic this: “Green Living Inside Out: Your Complete Guide to a Clean Lifestyle for Optimal Health.”\n"
        "• Return only the four titles, each on a new line, without numbering or labels.\n\n"
        f"User’s Input Title: \"{data.title}\"\n"
        f"User’s Article Content (if any):\n\"{data.content or 'N/A'}\""
    )

    try:
        # Run the sync .create() call in a seperate thread to avoid blocking
        HF_output = await asyncio.to_thread(         
            lambda: client.chat.completions.create(     # API call to HF which sends the prompt and receives a response.
                model="mistralai/Mistral-Nemo-Instruct-2407",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.8,     # allow creativity
                top_p=0.9,           # nucleus sampling
                max_tokens=120,      
                    
            )
        )

        # Extract final generated output from the model
        suggestion = HF_output.choices[0].message.content
        return SuggestOut(suggestions=suggestion)

    except Exception as e:
        # map any errors into a 500
        raise HTTPException(status_code=500, detail=str(e))
