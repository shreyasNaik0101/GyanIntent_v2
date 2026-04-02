import asyncio
import os
import sys
import json
from loguru import logger

from pipecat.transports.local.audio import LocalAudioTransport, LocalAudioTransportParams
from pipecat.services.aws.stt import AWSTranscribeSTTService
from pipecat.services.aws.tts import AWSPollyTTSService
from pipecat.services.llm_service import FunctionCallParams
from pipecat.services.aws.llm import AWSBedrockLLMService
from pipecat.frames.frames import LLMContextFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineTask
from pipecat.processors.aggregators.llm_response import LLMAssistantContextAggregator, LLMUserContextAggregator
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.adapters.schemas.function_schema import FunctionSchema
from pipecat.adapters.schemas.tools_schema import ToolsSchema

from config import AWS_REGION, AWS_ACCESS_KEY, AWS_SECRET_KEY
from run_manim import run_manim
from generate_manim_code import SYSTEM_PROMPT

# Configure Logger
logger.remove(0)
logger.add(sys.stderr, level="INFO")

async def main():
    # 1. Setup Transport (Local Mic/Speaker)
    transport_params = LocalAudioTransportParams(
        audio_in_sample_rate=16000,
        audio_out_sample_rate=16000
    )
    transport = LocalAudioTransport(params=transport_params)

    # 2. Setup Services
    stt = AWSTranscribeSTTService(
        region=AWS_REGION,
        aws_access_key_id=AWS_ACCESS_KEY,
        api_key=AWS_SECRET_KEY
    )
    
    llm = AWSBedrockLLMService(
        aws_region=AWS_REGION,
        aws_access_key=AWS_ACCESS_KEY,
        aws_secret_key=AWS_SECRET_KEY,
        model=os.getenv("BEDROCK_MODEL_ID", "us.anthropic.claude-sonnet-4-20250514-v1:0")
    )
    
    tts = AWSPollyTTSService(
        region=AWS_REGION,
        aws_access_key_id=AWS_ACCESS_KEY,
        api_key=AWS_SECRET_KEY,
        voice_id="Aditi"
    )

    # 3. Setup Logic (Tool-calling for Manim)
    async def render_tutor_animation(params: FunctionCallParams):
        explanation = params.arguments.get("explanation")
        code = params.arguments.get("code")
        
        print(f"\n [PIPECAT] Tool Triggered: Rendering Animation in background...")
        
        def render_and_open():
            video_path = run_manim(code)
            if video_path and os.path.exists(video_path):
                print(f" [PIPECAT] Rendering Complete! Opening: {video_path}")
                os.startfile(video_path) # Auto-play on Windows
            return video_path

        # Run Manim in a separate thread
        asyncio.create_task(asyncio.to_thread(render_and_open))
        
        result = f"Done! I am preparing a visualization for you now while I explain: {explanation}"
        await params.result_callback(result)

    llm.register_function("render_tutor_animation", render_tutor_animation)

    # 4. Context & Aggregators (Using Universal LLMContext and FunctionSchema)
    manim_tool = FunctionSchema(
        name="render_tutor_animation",
        description="Explains a physics or math concept using a Manim visual animation.",
        properties={
            "explanation": {"type": "string", "description": "The verbal explanation to speak to the user."},
            "code": {"type": "string", "description": "The complete Python Manim code (TutorScene)."}
        },
        required=["explanation", "code"]
    )
    
    tools_schema = ToolsSchema(standard_tools=[manim_tool])
    
    # Bedrock expects message content to be blocks, but universal context handles strings by wrapping them.
    # However, to be super safe with the Bedrock adapter, we'll provide the system message.
    context = LLMContext(
        messages=[{"role": "system", "content": SYSTEM_PROMPT}],
        tools=tools_schema
    )
    
    user_aggregator = LLMUserContextAggregator(context)
    assistant_aggregator = LLMAssistantContextAggregator(context)

    # 5. Build the Pipeline
    pipeline = Pipeline([
        transport.input(),         # Microphone
        stt,                      # STT
        user_aggregator,          # User Context
        llm,                      # LLM (Brain)
        tts,                      # TTS (Voice)
        transport.output(),       # Speaker
        assistant_aggregator      # Assistant Context
    ])

    task = PipelineTask(pipeline)

    @task.event_handler("on_pipeline_started")
    async def on_pipeline_started(task, frame):
        print(" [DEBUG] Pipeline started. Queuing Context...")
        await task.queue_frame(LLMContextFrame(context))
        print(" [DEBUG] Context queued. Queuing Greeting...")
        # We'll use a simple TextFrame. It should flow through to the TTS.
        from pipecat.frames.frames import TextFrame
        await task.queue_frame(TextFrame("Hello! I am Gyan, your AI tutor. I am listening!"))

    # 6. Run it
    runner = PipelineRunner()
    print("\n [PIPECAT] Gyan Tutor is LIVE. Speak now!")
    try:
        await runner.run(task)
    except Exception as e:
        print(f" [PIPECAT] Runner Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
