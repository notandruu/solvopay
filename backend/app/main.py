from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import sessions, webhooks
from app.services.poller import start_poller, stop_poller


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_poller()
    yield
    stop_poller()


app = FastAPI(title="SolvoPay API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions.router)
app.include_router(webhooks.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
