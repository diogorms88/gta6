"""Gera as imagens do site com a API da Higgsfield.

Credenciais (variáveis de ambiente lidas pelo SDK oficial):
    HF_API_KEY e HF_API_SECRET   (ou HF_KEY="chave:segredo")

Uso:
    pip install -r tools/higgsfield/requirements.txt
    python tools/higgsfield/generate.py                 # todas as imagens de prompts.json
    python tools/higgsfield/generate.py char-marisol    # só algumas
    python tools/higgsfield/generate.py --dry-run       # mostra os prompts sem chamar a API

As imagens são salvas em assets/img/<nome>.webp, substituindo as renderizações 3D
(o histórico do git guarda as versões anteriores).
"""
import argparse
import io
import json
import os
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PROMPTS = Path(__file__).with_name("prompts.json")
OUT = ROOT / "assets" / "img"


def has_credentials() -> bool:
    return bool(os.getenv("HF_KEY") or (os.getenv("HF_API_KEY") and os.getenv("HF_API_SECRET")))


def save_webp(url: str, dest: Path) -> None:
    from PIL import Image

    with urllib.request.urlopen(url, timeout=120) as resp:
        data = resp.read()
    img = Image.open(io.BytesIO(data)).convert("RGB")
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "WEBP", quality=88, method=6)
    print(f"  salvo {dest.relative_to(ROOT)} ({img.width}x{img.height})")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("names", nargs="*", help="nomes das imagens (padrão: todas)")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--resolution", default="2K")
    args = ap.parse_args()

    cfg = json.loads(PROMPTS.read_text(encoding="utf-8"))
    images = cfg["images"]
    names = args.names or list(images)
    unknown = [n for n in names if n not in images]
    if unknown:
        print(f"Nomes desconhecidos: {', '.join(unknown)}. Disponíveis: {', '.join(images)}")
        return 2

    if args.dry_run:
        for n in names:
            print(f"[{n}] {images[n]['aspect_ratio']}\n  {images[n]['prompt']}. {cfg['style']}\n")
        return 0

    if not has_credentials():
        print("Faltam as credenciais: defina HF_API_KEY e HF_API_SECRET (ou HF_KEY).")
        return 1

    import higgsfield_client

    failed = []
    for n in names:
        spec = images[n]
        print(f"[{n}] gerando...")
        try:
            result = higgsfield_client.subscribe(
                cfg["model"],
                arguments={
                    "prompt": f"{spec['prompt']}. {cfg['style']}",
                    "resolution": args.resolution,
                    "aspect_ratio": spec["aspect_ratio"],
                    "camera_fixed": False,
                },
            )
            save_webp(result["images"][0]["url"], OUT / f"{n}.webp")
        except Exception as e:  # segue para as próximas imagens
            print(f"  falhou: {e}")
            failed.append(n)

    if failed:
        print(f"Falharam: {', '.join(failed)}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
