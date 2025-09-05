"""
OpenAI-Compatible API Server
Drop-in replacement for OpenAI API with local models
"""

import asyncio
import json
import logging
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, AsyncGenerator, Dict, List, Optional, Union

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import uvicorn

from ..models.multi_model_manager import get_model_manager
from ..context.smart_context_manager import get_context_manager
from ..privacy.pii_scrubber import get_pii_scrubber

logger = logging.getLogger(__name__)


# OpenAI API Models
class ChatMessage(BaseModel):
    role: str = Field(..., description="Role of the message sender")
    content: str = Field(..., description="Content of the message")
    name: Optional[str] = Field(None, description="Name of the sender")


class ChatCompletionRequest(BaseModel):
    model: str = Field(..., description="Model to use for completion")
    messages: List[ChatMessage] = Field(..., description="List of messages")
    temperature: Optional[float] = Field(0.7, ge=0.0, le=2.0)
    top_p: Optional[float] = Field(1.0, ge=0.0, le=1.0)
    n: Optional[int] = Field(1, ge=1, le=128)
    stream: Optional[bool] = Field(False)
    stop: Optional[Union[str, List[str]]] = Field(None)
    max_tokens: Optional[int] = Field(None, ge=1)
    presence_penalty: Optional[float] = Field(0.0, ge=-2.0, le=2.0)
    frequency_penalty: Optional[float] = Field(0.0, ge=-2.0, le=2.0)
    logit_bias: Optional[Dict[str, float]] = Field(None)
    user: Optional[str] = Field(None)
    functions: Optional[List[Dict]] = Field(None)
    function_call: Optional[Union[str, Dict]] = Field(None)


class ChatCompletionResponse(BaseModel):
    id: str = Field(..., description="Unique identifier")
    object: str = Field("chat.completion", description="Object type")
    created: int = Field(..., description="Unix timestamp")
    model: str = Field(..., description="Model used")
    choices: List[Dict[str, Any]] = Field(..., description="Completion choices")
    usage: Dict[str, int] = Field(..., description="Token usage")


class ChatCompletionChunk(BaseModel):
    id: str = Field(..., description="Unique identifier")
    object: str = Field("chat.completion.chunk", description="Object type") 
    created: int = Field(..., description="Unix timestamp")
    model: str = Field(..., description="Model used")
    choices: List[Dict[str, Any]] = Field(..., description="Completion choices")


class CompletionRequest(BaseModel):
    model: str = Field(..., description="Model to use")
    prompt: Union[str, List[str]] = Field(..., description="Prompt(s)")
    suffix: Optional[str] = Field(None)
    max_tokens: Optional[int] = Field(16, ge=1)
    temperature: Optional[float] = Field(1.0, ge=0.0, le=2.0)
    top_p: Optional[float] = Field(1.0, ge=0.0, le=1.0)
    n: Optional[int] = Field(1, ge=1, le=128)
    stream: Optional[bool] = Field(False)
    logprobs: Optional[int] = Field(None, ge=0, le=5)
    echo: Optional[bool] = Field(False)
    stop: Optional[Union[str, List[str]]] = Field(None)
    presence_penalty: Optional[float] = Field(0.0, ge=-2.0, le=2.0)
    frequency_penalty: Optional[float] = Field(0.0, ge=-2.0, le=2.0)
    best_of: Optional[int] = Field(1, ge=1, le=20)
    logit_bias: Optional[Dict[str, float]] = Field(None)
    user: Optional[str] = Field(None)


class ModelInfo(BaseModel):
    id: str = Field(..., description="Model identifier")
    object: str = Field("model", description="Object type")
    created: int = Field(..., description="Creation timestamp")
    owned_by: str = Field("bear-ai", description="Owner")
    permission: List[Dict] = Field(default_factory=list)
    root: Optional[str] = Field(None)
    parent: Optional[str] = Field(None)


class OpenAIServer:
    """OpenAI-compatible API server for BEAR AI"""
    
    def __init__(self, host: str = "127.0.0.1", port: int = 8000):
        self.host = host
        self.port = port
        self.app = None
        
        # Get BEAR AI managers
        self.model_manager = get_model_manager()
        self.context_manager = get_context_manager()
        self.pii_scrubber = get_pii_scrubber()
        
        logger.info(f"OpenAI server initialized on {host}:{port}")
    
    def create_app(self) -> FastAPI:
        """Create FastAPI application with OpenAI-compatible endpoints"""
        
        @asynccontextmanager
        async def lifespan(app: FastAPI):
            """Application lifespan management"""
            logger.info("Starting BEAR AI OpenAI-compatible server...")
            yield
            logger.info("Shutting down BEAR AI OpenAI-compatible server...")
        
        app = FastAPI(
            title="BEAR AI OpenAI-Compatible API",
            description="Drop-in replacement for OpenAI API with local models",
            version="0.1.0-alpha",
            lifespan=lifespan
        )
        
        # Add CORS middleware
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        
        # Models endpoint
        @app.get("/v1/models")
        async def list_models():
            """List available models"""
            try:
                available_models = await self.model_manager.list_models()
                
                models = []
                for model_id in available_models:
                    models.append(ModelInfo(
                        id=model_id,
                        created=int(time.time()),
                        owned_by="bear-ai"
                    ).dict())
                
                return {"object": "list", "data": models}
                
            except Exception as e:
                logger.error(f"Error listing models: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        # Chat completions endpoint
        @app.post("/v1/chat/completions")
        async def create_chat_completion(request: ChatCompletionRequest):
            """Create chat completion"""
            try:
                # Convert messages to BEAR AI format
                conversation = []
                for msg in request.messages:
                    # Scrub PII from messages if enabled
                    content = msg.content
                    if hasattr(self.pii_scrubber, 'scrub'):
                        scrub_result = await self.pii_scrubber.scrub(content)
                        content = scrub_result.get('scrubbed_text', content)
                    
                    conversation.append({
                        "role": msg.role,
                        "content": content,
                        "timestamp": datetime.now().isoformat()
                    })
                
                # Use context manager to handle conversation
                context = await self.context_manager.create_session(
                    session_id=str(uuid.uuid4()),
                    max_tokens=request.max_tokens or 4096
                )
                
                # Add messages to context
                for msg in conversation:
                    await self.context_manager.add_message(
                        context.session_id,
                        msg["role"],
                        msg["content"]
                    )
                
                # Generate response
                if request.stream:
                    return StreamingResponse(
                        self._stream_chat_completion(request, context),
                        media_type="text/plain"
                    )
                else:
                    return await self._create_chat_completion(request, context)
                    
            except Exception as e:
                logger.error(f"Error in chat completion: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        # Text completions endpoint
        @app.post("/v1/completions")
        async def create_completion(request: CompletionRequest):
            """Create text completion"""
            try:
                # Convert to chat format
                if isinstance(request.prompt, str):
                    prompts = [request.prompt]
                else:
                    prompts = request.prompt
                
                results = []
                for prompt in prompts:
                    # Scrub PII if enabled
                    if hasattr(self.pii_scrubber, 'scrub'):
                        scrub_result = await self.pii_scrubber.scrub(prompt)
                        prompt = scrub_result.get('scrubbed_text', prompt)
                    
                    # Generate completion using model manager
                    response = await self.model_manager.generate_response(
                        model_id=request.model,
                        prompt=prompt,
                        max_tokens=request.max_tokens,
                        temperature=request.temperature,
                        top_p=request.top_p,
                        stop=request.stop
                    )
                    
                    results.append({
                        "text": response,
                        "index": len(results),
                        "logprobs": None,
                        "finish_reason": "stop"
                    })
                
                return {
                    "id": f"cmpl-{uuid.uuid4().hex}",
                    "object": "text_completion",
                    "created": int(time.time()),
                    "model": request.model,
                    "choices": results,
                    "usage": {
                        "prompt_tokens": sum(len(p.split()) for p in prompts),
                        "completion_tokens": sum(len(r["text"].split()) for r in results),
                        "total_tokens": sum(len(p.split()) for p in prompts) + sum(len(r["text"].split()) for r in results)
                    }
                }
                
            except Exception as e:
                logger.error(f"Error in text completion: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        # Embeddings endpoint
        @app.post("/v1/embeddings")
        async def create_embeddings(request: dict):
            """Create embeddings"""
            try:
                # Extract input text
                input_text = request.get("input", "")
                model = request.get("model", "text-embedding-ada-002")
                
                if isinstance(input_text, list):
                    texts = input_text
                else:
                    texts = [input_text]
                
                # Generate embeddings using RAG engine
                from ..rag.rag_engine import get_rag_engine
                rag_engine = get_rag_engine()
                
                embeddings_data = []
                for i, text in enumerate(texts):
                    # Scrub PII if enabled
                    if hasattr(self.pii_scrubber, 'scrub'):
                        scrub_result = await self.pii_scrubber.scrub(text)
                        text = scrub_result.get('scrubbed_text', text)
                    
                    embedding = await rag_engine.generate_embedding(text)
                    
                    embeddings_data.append({
                        "object": "embedding",
                        "embedding": embedding.tolist() if hasattr(embedding, 'tolist') else embedding,
                        "index": i
                    })
                
                return {
                    "object": "list",
                    "data": embeddings_data,
                    "model": model,
                    "usage": {
                        "prompt_tokens": sum(len(text.split()) for text in texts),
                        "total_tokens": sum(len(text.split()) for text in texts)
                    }
                }
                
            except Exception as e:
                logger.error(f"Error creating embeddings: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        # Health check
        @app.get("/health")
        async def health_check():
            """Health check endpoint"""
            return {
                "status": "healthy",
                "timestamp": datetime.now().isoformat(),
                "version": "0.1.0-alpha",
                "models_loaded": len(await self.model_manager.list_models())
            }
        
        return app
    
    async def _create_chat_completion(
        self, 
        request: ChatCompletionRequest, 
        context
    ) -> Dict[str, Any]:
        """Create non-streaming chat completion"""
        
        # Get conversation from context
        conversation = await self.context_manager.get_conversation(context.session_id)
        
        # Generate response using model manager
        response = await self.model_manager.generate_conversation_response(
            model_id=request.model,
            conversation=conversation,
            max_tokens=request.max_tokens,
            temperature=request.temperature,
            top_p=request.top_p,
            stop=request.stop
        )
        
        # Add response to context
        await self.context_manager.add_message(
            context.session_id,
            "assistant",
            response
        )
        
        return ChatCompletionResponse(
            id=f"chatcmpl-{uuid.uuid4().hex}",
            created=int(time.time()),
            model=request.model,
            choices=[{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": response
                },
                "finish_reason": "stop"
            }],
            usage={
                "prompt_tokens": sum(len(msg["content"].split()) for msg in conversation),
                "completion_tokens": len(response.split()),
                "total_tokens": sum(len(msg["content"].split()) for msg in conversation) + len(response.split())
            }
        ).dict()
    
    async def _stream_chat_completion(
        self, 
        request: ChatCompletionRequest, 
        context
    ) -> AsyncGenerator[str, None]:
        """Stream chat completion chunks"""
        
        chunk_id = f"chatcmpl-{uuid.uuid4().hex}"
        created = int(time.time())
        
        try:
            # Get conversation from context
            conversation = await self.context_manager.get_conversation(context.session_id)
            
            # Stream response from model manager
            response_chunks = []
            async for chunk in self.model_manager.generate_conversation_response_stream(
                model_id=request.model,
                conversation=conversation,
                max_tokens=request.max_tokens,
                temperature=request.temperature,
                top_p=request.top_p,
                stop=request.stop
            ):
                response_chunks.append(chunk)
                
                # Send chunk in OpenAI format
                chunk_data = ChatCompletionChunk(
                    id=chunk_id,
                    created=created,
                    model=request.model,
                    choices=[{
                        "index": 0,
                        "delta": {
                            "content": chunk
                        },
                        "finish_reason": None
                    }]
                )
                
                yield f"data: {chunk_data.json()}\n\n"
            
            # Send final chunk
            final_chunk = ChatCompletionChunk(
                id=chunk_id,
                created=created,
                model=request.model,
                choices=[{
                    "index": 0,
                    "delta": {},
                    "finish_reason": "stop"
                }]
            )
            
            yield f"data: {final_chunk.json()}\n\n"
            yield "data: [DONE]\n\n"
            
            # Add complete response to context
            complete_response = "".join(response_chunks)
            await self.context_manager.add_message(
                context.session_id,
                "assistant",
                complete_response
            )
            
        except Exception as e:
            logger.error(f"Error in streaming: {e}")
            error_chunk = {
                "id": chunk_id,
                "object": "chat.completion.chunk",
                "created": created,
                "model": request.model,
                "choices": [{
                    "index": 0,
                    "delta": {"content": f"Error: {str(e)}"},
                    "finish_reason": "error"
                }]
            }
            yield f"data: {json.dumps(error_chunk)}\n\n"
            yield "data: [DONE]\n\n"
    
    async def start_server(self):
        """Start the OpenAI-compatible server"""
        self.app = self.create_app()
        
        config = uvicorn.Config(
            self.app,
            host=self.host,
            port=self.port,
            log_level="info"
        )
        
        server = uvicorn.Server(config)
        await server.serve()
    
    def run_server(self):
        """Run the server (blocking)"""
        asyncio.run(self.start_server())


# Global server instance
_global_server: Optional[OpenAIServer] = None

def get_openai_server(host: str = "127.0.0.1", port: int = 8000) -> OpenAIServer:
    """Get global OpenAI server instance"""
    global _global_server
    if _global_server is None:
        _global_server = OpenAIServer(host, port)
    return _global_server

def start_openai_server(host: str = "127.0.0.1", port: int = 8000):
    """Start OpenAI-compatible server"""
    server = get_openai_server(host, port)
    server.run_server()