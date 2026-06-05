import asyncio
from app.routers.jobs import extract_job
from app.schemas.job import ExtractRequest

async def main():
    req = ExtractRequest(url="https://kaleris.wd501.myworkdayjobs.com/kaleris_careers/job/Alpharetta---HQ/AI-SENIOR-SOLUTIONS-ARCHITECT_R-100526-1?source=LinkedIn")
    result = await extract_job(req)
    print("Company:", result.company)
    print("Title:", result.title)
    print("Location:", result.location)
    print("Description length:", len(result.description))

if __name__ == "__main__":
    asyncio.run(main())
