@router.get("/events/{run_id}")
async def generation_events(
    run_id: uuid.UUID,
    request: Request
):
    """Stream generation status updates."""
    logger.info(f"SSE Handshake initiated for run_id: {run_id}")
    async def event_generator():
        last_status = None
        while True:
            if await request.is_disconnected():
                break

            db = SessionLocal()
            try:
                run = db.query(GenerationRun).filter(GenerationRun.id == run_id).first()
                if not run:
                    yield {"data": {"status": "failed", "error": "Run not found", "completed": True}}
                    break
                
                if run.status != last_status:
                    yield {
                        "data": {
                            "status": run.status,
                            "error": run.error_message,
                            "completed": run.status in ["complete", "failed"]
                        }
                    }
                    last_status = run.status

                if run.status in ["complete", "failed"]:
                    break
            except Exception as e:
                logger.error(f"SSE Generator Error: {str(e)}")
                yield {"data": {"status": "failed", "error": "Internal stream error", "completed": True}}
                break
            finally:
                db.close()

            await asyncio.sleep(1)

    return EventSourceResponse(event_generator())
