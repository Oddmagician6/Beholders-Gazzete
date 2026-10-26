import base64
import json
import sys
from pathlib import Path

import soundfile as sf
import numpy as np
import spacy
from kokoro import KPipeline


# Keep spaCy's built-in English tokenizer rules on Windows. The serialized
# en_core_web_sm tokenizer currently overflows while loading under this setup.
_spacy_load = spacy.load


def _load_model_with_default_tokenizer(name, *args, **kwargs):
    if name == "en_core_web_sm":
        exclude = set(kwargs.get("exclude") or [])
        exclude.add("tokenizer")
        kwargs["exclude"] = list(exclude)
    return _spacy_load(name, *args, **kwargs)


spacy.load = _load_model_with_default_tokenizer


def main():
    segments = json.loads(base64.b64decode(sys.argv[1]).decode("utf-8"))
    output_dir = Path(sys.argv[2])
    voice = sys.argv[3]
    pipeline = KPipeline(lang_code="a")

    for segment in segments:
        chunks = []
        for _, _, audio in pipeline(segment["text"], voice=voice, split_pattern=r"\n+"):
            chunks.append(audio.detach().cpu().numpy() if hasattr(audio, "detach") else np.asarray(audio))
        if not chunks:
            raise RuntimeError(f"Kokoro returned no audio for segment {segment['id']}")
        audio = chunks[0] if len(chunks) == 1 else np.concatenate(chunks)
        sf.write(output_dir / f"{segment['id']}.wav", audio, 24000, subtype="PCM_16")


if __name__ == "__main__":
    main()
