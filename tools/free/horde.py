"""Gera as imagens do site de graça pela AI Horde (https://aihorde.net), sem chave e sem marca d'água.

A AI Horde é uma rede comunitária de GPUs voluntárias. Pedidos anônimos (chave 0000000000)
têm prioridade baixa: cada imagem pode levar de segundos a alguns minutos.

Uso:
    pip install httpx Pillow
    python tools/free/horde.py                     # todas as imagens de tools/higgsfield/prompts.json
    python tools/free/horde.py hero keys           # só algumas
    python tools/free/horde.py hero --model "AlbedoBase XL (SDXL)"
"""
import argparse
import io
import json
import sys
import time
from pathlib import Path

import httpx
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
PROMPTS = ROOT / "tools" / "higgsfield" / "prompts.json"
OUT = ROOT / "assets" / "img"
API = "https://aihorde.net/api/v2"
HEADERS = {"apikey": "0000000000", "Client-Agent": "neon-tide-site:1.0:github.com/diogorms88/gta6"}
NEGATIVE = "text, watermark, logo, signature, blurry, lowres, jpeg artifacts, deformed, extra fingers, bad anatomy, cartoon, anime"
# resoluções nativas do SDXL (múltiplos de 64)
SIZES = {"16:9": (1344, 768), "3:4": (896, 1152), "4:3": (1152, 896), "1:1": (1024, 1024), "9:16": (768, 1344)}


def generate(client, prompt, aspect, model, upscale, seed):
    w, h = SIZES[aspect]
    params = {
        "sampler_name": "k_dpmpp_2m", "karras": True, "cfg_scale": 5.5, "steps": 30,
        "width": w, "height": h, "n": 1,
    }
    if seed:
        params["seed"] = str(seed)
    if upscale:
        params["post_processing"] = ["RealESRGAN_x2plus"]
    body = {
        "prompt": f"{prompt} ### {NEGATIVE}",
        "params": params,
        "models": [model],
        "nsfw": False, "censor_nsfw": True, "r2": True, "shared": False,
    }
    r = client.post(f"{API}/generate/async", json=body)
    if r.status_code >= 400:
        raise RuntimeError(f"envio recusado ({r.status_code}): {r.text[:300]}")
    rid = r.json()["id"]
    t0 = time.time()
    while True:
        time.sleep(6)
        s = client.get(f"{API}/generate/check/{rid}").json()
        if s.get("faulted"):
            raise RuntimeError("falhou na rede Horde")
        if not s.get("is_possible", True):
            raise RuntimeError("nenhum worker disponível para esses parâmetros")
        if s.get("done"):
            break
        print(f"    fila: posição {s.get('queue_position')}, espera ~{s.get('wait_time')}s ({int(time.time() - t0)}s)", flush=True)
        if time.time() - t0 > 1800:
            client.delete(f"{API}/generate/status/{rid}")
            raise RuntimeError("tempo esgotado")
    res = client.get(f"{API}/generate/status/{rid}").json()
    gen = res["generations"][0]
    if gen.get("censored"):
        raise RuntimeError("imagem bloqueada pelo filtro de conteúdo")
    img = client.get(gen["img"], timeout=120).content
    return Image.open(io.BytesIO(img)).convert("RGB"), gen.get("worker_name")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("names", nargs="*")
    ap.add_argument("--model", default="Juggernaut XL")
    ap.add_argument("--no-upscale", action="store_true")
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--out", default=str(OUT))
    args = ap.parse_args()

    cfg = json.loads(PROMPTS.read_text(encoding="utf-8"))
    images = cfg["images"]
    names = args.names or list(images)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    failed = []
    with httpx.Client(headers=HEADERS, timeout=60) as client:
        for n in names:
            spec = images[n]
            print(f"[{n}] gerando com {args.model}...", flush=True)
            try:
                img, worker = generate(client, f"{spec['prompt']}, {cfg['style']}", spec["aspect_ratio"],
                                       args.model, not args.no_upscale, args.seed)
                dest = out / f"{n}.webp"
                img.save(dest, "WEBP", quality=88, method=6)
                print(f"  salvo {dest} ({img.width}x{img.height}, worker: {worker})", flush=True)
            except Exception as e:
                print(f"  falhou: {e}", flush=True)
                failed.append(n)
    if failed:
        print("Falharam: " + ", ".join(failed))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
