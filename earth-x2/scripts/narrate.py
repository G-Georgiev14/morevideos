"""Synthesize the supplied script and export subtitle and shot timing data."""
import argparse
import asyncio
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
LINES = (ROOT / "narration.txt").read_text().splitlines()
AUDIO = ROOT / "public/audio/narration.mp3"

def ffmpeg(*args):
    subprocess.run(["ffmpeg", "-v", "error", "-y", *map(str, args)], check=True)

def seconds(path):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                         "-of", "csv=p=0", str(path)]))

def normalize(text):
    return re.sub(r"\W+", "", text.lower()).replace("24", "twentyfour")

def script_words(text):
    return text.split()

async def take(text, target, rate):
    from edge_tts import Communicate
    from edge_tts.exceptions import NoAudioReceived
    for attempt in range(3):
        words = []
        try:
            with target.open("wb") as stream:
                async for event in Communicate(text, "en-US-AndrewNeural", rate=rate, boundary="WordBoundary",
                                               proxy=os.getenv("HTTPS_PROXY")).stream():
                    if event["type"] == "audio":
                        stream.write(event["data"])
                    elif event["type"] == "WordBoundary":
                        words.append(dict(text=event["text"], start=event["offset"]/1e7,
                                          end=(event["offset"]+event["duration"])/1e7))
            if words and target.stat().st_size:
                return words
        except NoAudioReceived:
            pass
        await asyncio.sleep(.3 * (attempt + 1))
    raise RuntimeError(f"No speech returned for: {text}")

def flite(text, wav, work):
    script = work / (wav.stem + ".txt")
    script.write_text(text)
    ffmpeg("-f", "lavfi", "-i", f"flite=textfile={script}:voice=slt", "-ar", 48000, wav)
    span = seconds(wav)
    tokens = script_words(text)
    weights = [max(3, len(token)) for token in tokens]
    total = sum(weights)
    return [dict(text=token, start=.045 + (span-.11) * sum(weights[:i])/total,
                 end=.045 + (span-.11) * sum(weights[:i+1])/total)
            for i, token in enumerate(tokens)]

def align(text, words):
    tokens = script_words(text)
    if len(tokens) == len(words):
        return [dict(word, text=token) for token, word in zip(tokens, words)]
    if "".join(normalize(w["text"]) for w in words) != "".join(map(normalize, tokens)):
        raise ValueError(f"Cannot align: {text}")
    spans = []
    cursor = 0
    for word in words:
        width = len(normalize(word["text"]))
        if width:
            spans.append((cursor, cursor + width, word))
            cursor += width

    def boundary(position, closing):
        for lower, upper, word in spans:
            if (lower < position <= upper) if closing else (lower <= position < upper):
                fraction = (position-lower)/(upper-lower)
                return word["start"] + fraction *(word["end"]-word["start"])
        raise ValueError(f"Missing script position: {position}")

    aligned = []
    cursor = 0
    for token in tokens:
        width = len(normalize(token))
        aligned.append(dict(text=token, start=boundary(cursor, False),
                            end=boundary(cursor+width, True)))
        cursor += width
    return aligned

async def takes(work, local, rate):
    if not local:
        from edge_tts.communicate import _SSL_CTX
        if bundle := os.getenv("SSL_CERT_FILE"):
            _SSL_CTX.load_verify_locations(cafile=bundle)
    limit = asyncio.Semaphore(5)

    async def line_audio(index, line):
        wav = work / f"{index}.wav"
        if local:
            return wav, flite(line, wav, work)
        async with limit:
            mp3 = wav.with_suffix(".mp3")
            try:
                words = await take(line, mp3, rate)
                ffmpeg("-i", mp3, "-ar", 48000, wav)
                return wav, align(line, words)
            except RuntimeError:
                sentences = re.findall(r"[^.!?]+[.!?]?", line)
                if len(sentences) == 1:
                    raise
                parts, merged, offset = [], [], 0
                for j, sentence in enumerate(sentences):
                    input_audio = work / f"{index}-{j}.mp3"
                    part = input_audio.with_suffix(".wav")
                    words = await take(sentence.strip(), input_audio, rate)
                    ffmpeg("-i", input_audio, "-ar", 48000, part)
                    merged.extend(dict(w, start=w["start"]+offset, end=w["end"]+offset) for w in align(sentence.strip(), words))
                    parts.append(part)
                    offset += seconds(part)
                concat(parts, wav)
                return wav, merged

    return await asyncio.gather(*(line_audio(i, line) for i, line in enumerate(LINES)))

def concat(paths, output, *args):
    listing = Path(output).with_suffix(".concat.txt")
    listing.write_text("\n".join(f"file '{path}'" for path in paths))
    try:
        ffmpeg("-f", "concat", "-safe", 0, "-i", listing, *args, output)
    finally:
        listing.unlink()

def stamp(value):
    n = round(value * 1000)
    return f"{n//3600000:02d}:{n//60000%60:02d}:{n//1000%60:02d},{n%1000:03d}"

def captions(words):
    group = []
    for word in words:
        group.append(word)
        if word["text"].endswith((".", "!", "?")) or len(group) >= 6:
            yield group
            group = []
    if group:
        yield group

def generate(local, rate):
    with tempfile.TemporaryDirectory() as temp:
        work = Path(temp)
        recordings = asyncio.run(takes(work, local, rate))
        # A modest uniform tempo correction leaves the last visual beat room to land.
        speed = sum(seconds(wav) for wav, _ in recordings) / 58.1
        combined = work / "read.wav"
        concat([wav for wav, _ in recordings], combined)
        ffmpeg("-i", combined, "-af", f"atempo={speed:.9f},loudnorm=I=-16:TP=-2:LRA=9",
               "-ar", 48000, "-b:a", "160k", AUDIO)
        offset = 0.0
        lines, subtitles = [], []
        for wav, words in recordings:
            adjusted = [dict(w, start=round((w["start"]+offset)/speed, 4),
                             end=round((w["end"]+offset)/speed, 4)) for w in words]
            lines.append(adjusted)
            subtitles.extend(captions(adjusted))
            offset += seconds(wav)
        manifest = {"voice":"Flite SLT" if local else "en-US-AndrewNeural", "lines":lines, "captions":subtitles}
        (ROOT / "src/timing.json").write_text(json.dumps(manifest, indent=2) + "\n")
        (ROOT / "out/subtitles.srt").write_text("\n\n".join(
            f'{i}\n{stamp(group[0]["start"])} --> {stamp(group[-1]["end"])}\n' +
            " ".join(w["text"] for w in group) for i, group in enumerate(subtitles, 1)) + "\n")
        print(manifest["voice"], len(subtitles), "caption cues", seconds(AUDIO), "seconds")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--local", action="store_true", help="Use FFmpeg Flite with estimated word timing.")
    parser.add_argument("--rate", default="+0%", help="Native Edge voice rate.")
    args = parser.parse_args()
    generate(args.local, args.rate)
