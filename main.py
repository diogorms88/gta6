"""Exemplo: gera um vídeo com Seedance 2.5 (texto -> vídeo) usando o SDK oficial da Higgsfield.

Credenciais: HF_KEY="key-id:key-secret" em .env.local (ignorado pelo git).
Uso:
    pip install -r requirements.txt
    python main.py
"""
import sys

from dotenv import load_dotenv

# Carrega .env.local sem sobrescrever variáveis já definidas no ambiente.
load_dotenv(".env.local")

import higgsfield_client  # noqa: E402  (precisa das variáveis já carregadas)
from higgsfield_client import NSFW, Cancelled, Completed, InProgress, Queued  # noqa: E402

MODEL = "bytedance/seedance-2.5/text-to-video"
ARGUMENTS = {
    "prompt": "A cinematic scene at sunset",
    "duration": 5,
    "resolution": "720p",
    "aspect_ratio": "16:9",
}


def find_video_url(result):
    """URL do vídeo: a documentação indica o campo video.url (videos[0].url como reserva)."""
    if not isinstance(result, dict):
        return None
    video = result.get("video")
    if isinstance(video, dict) and video.get("url"):
        return video["url"]
    videos = result.get("videos")
    if isinstance(videos, list) and videos and isinstance(videos[0], dict) and videos[0].get("url"):
        return videos[0]["url"]
    return None


def main() -> int:
    final_status = {"value": None}

    def on_enqueue(request_id: str) -> None:
        print(f"Pedido enviado: {request_id}")

    def on_update(status) -> None:
        final_status["value"] = status
        if isinstance(status, Queued):
            print("Na fila...")
        elif isinstance(status, InProgress):
            print("Gerando...")

    try:
        result = higgsfield_client.subscribe(
            MODEL, arguments=ARGUMENTS, on_enqueue=on_enqueue, on_queue_update=on_update
        )
    except higgsfield_client.CredentialsMissedError:
        print("Erro: credenciais ausentes. Defina HF_KEY em .env.local.", file=sys.stderr)
        return 1
    except Exception as e:  # erros HTTP, rede, validação
        print(f"Erro ao chamar a API: {type(e).__name__}: {e}", file=sys.stderr)
        return 1

    # subscribe() não lança exceção nesses casos: é preciso checar o status final.
    # A resposta traz "status" (completed | failed | nsfw | canceled); o callback serve de reserva.
    api_status = result.get("status") if isinstance(result, dict) else None
    status = final_status["value"]
    if api_status == "nsfw" or isinstance(status, NSFW):
        print("Pedido bloqueado pela moderação (NSFW). Nenhum vídeo gerado.", file=sys.stderr)
        return 1
    if api_status in ("canceled", "cancelled") or isinstance(status, Cancelled):
        print("Pedido cancelado. Nenhum vídeo gerado.", file=sys.stderr)
        return 1
    if api_status != "completed" and not (api_status is None and isinstance(status, Completed)):
        detail = result.get("error") if isinstance(result, dict) else None
        print(f"Falha na geração (status: {api_status or type(status).__name__}). {detail or ''}".strip(), file=sys.stderr)
        return 1

    url = find_video_url(result)
    if not url:
        print(f"Concluído, mas sem URL de vídeo na resposta. Chaves recebidas: {list(result)}", file=sys.stderr)
        return 1
    print(f"Vídeo: {url}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
