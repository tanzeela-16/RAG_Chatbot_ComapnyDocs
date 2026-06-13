from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    groq_api_key: str
    chroma_persist_dir: str = "./chroma_db"
    max_upload_size_mb: int = 20
    chunk_size: int = 512
    chunk_overlap: int = 64

    class Config:
        env_file = ".env"
        # This ensures that even if you have extra variables in your .env 
        # (like old OpenAI keys), Pydantic won't crash.
        extra = "ignore" 

settings = Settings()