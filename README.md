# NEON TIDE

Site promocional de um jogo de mundo aberto **fictício**, inspirado no estilo das grandes páginas de lançamento de jogos: intro com máscara de título que dá zoom, seções fixadas com rolagem, parallax, galeria horizontal e lightbox.

Todo o conteúdo é original: nome, personagens (Marisol Vega e Dex Calloway), locais (estado de Palmera, Coral City…), textos e imagens. As imagens são renderizações 3D feitas com shaders próprios (raymarching), no estilo de capturas de jogo.

## Rodar localmente

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

Não precisa de build. As bibliotecas (GSAP + ScrollTrigger, Lenis) e as fontes (Anton, Inter) já estão no projeto, então funciona offline.

## Estrutura

| Caminho | O que é |
|---|---|
| `index.html` | Página única com todas as seções |
| `css/style.css` | Estilos, tema e layout responsivo |
| `js/main.js` | Animações de rolagem (GSAP ScrollTrigger + rolagem suave Lenis) |
| `assets/img/*.webp` | Imagens renderizadas em 3D (2560×1440 e 1920×1080) |
| `tools/render/` | Renderizador: cenas GLSL em `scenes/`, executado no Chromium via Playwright |
| `vendor/` | GSAP 3.12.5 e Lenis 1.1.13 |
| `assets/fonts/` | Anton e Inter (licença SIL OFL) |

## Trocar as imagens

Coloque suas próprias imagens (com direitos de uso) em `assets/img/` e troque os `src` / `data-full` no `index.html`. Para ficarem nítidas em telas grandes, use pelo menos 2560 px de largura (WebP ou AVIF).

## Renderizar as imagens de novo

As cenas ficam em `tools/render/scenes/*.glsl` (arquivos com `_` são partes compartilhadas, usadas via `#include`). O renderizador roda os shaders no Chromium em modo headless, funciona até sem GPU, e grava em `assets/img/`:

```bash
npm i -D playwright            # uma vez
node tools/render/render.cjs                          # todas as cenas, 2560x1440, 4 amostras por pixel
node tools/render/render.cjs hero keys --w=1920 --h=1080 --spp=2
node tools/render/render.cjs char-dex --size-char-dex=1200x1600
```
