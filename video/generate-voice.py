import asyncio
import json
from pathlib import Path
import edge_tts

root = Path(__file__).resolve().parent
lines = json.loads((root / 'voice_lines.json').read_text(encoding='utf-8'))
target = root / 'public' / 'voice'
target.mkdir(parents=True, exist_ok=True)

async def render(index, line):
    output = target / f'{index + 1:02}.mp3'
    if output.exists() and output.stat().st_size > 1000:
        return
    await edge_tts.Communicate(line, voice='zh-CN-YunyangNeural', rate='-4%').save(str(output))
    print(f'Voice {index + 1:02}: {output.stat().st_size} bytes', flush=True)

async def main():
    sem = asyncio.Semaphore(3)
    async def limited(i, line):
        async with sem:
            await render(i, line)
    await asyncio.gather(*(limited(i, line) for i, line in enumerate(lines)))

asyncio.run(main())
