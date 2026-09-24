"""Exemplo: gera uma imagem com Soul V2 (texto -> imagem) usando o SDK oficial da Higgsfield.

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

MODEL = "higgsfield-ai/soul/v2/standard"
ARGUMENTS = {
    "prompt": "A cinematic scene at sunset",
    "resolution": "1080p",
    "aspect_ratio": "16:9",
}


def find_image_url(result):
    """URL da imagem: a documentação indica o campo images[0].url."""
    if not isinstance(result, dict):
        return None
    images = result.get("images")
    if isinstance(images, list) and images and isinstance(images[0], dict) and images[0].get("url"):
        return images[0]["url"]
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
        print("Pedido bloqueado pela moderação (NSFW). Nenhuma imagem gerada.", file=sys.stderr)
        return 1
    if api_status in ("canceled", "cancelled") or isinstance(status, Cancelled):
        print("Pedido cancelado. Nenhuma imagem gerada.", file=sys.stderr)
        return 1
    if api_status != "completed" and not (api_status is None and isinstance(status, Completed)):
        detail = result.get("error") if isinstance(result, dict) else None
        print(f"Falha na geração (status: {api_status or type(status).__name__}). {detail or ''}".strip(), file=sys.stderr)
        return 1

    url = find_image_url(result)
    if not url:
        print(f"Concluído, mas sem URL de imagem na resposta. Chaves recebidas: {list(result)}", file=sys.stderr)
        return 1
    print(f"Imagem: {url}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
