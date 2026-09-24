# NEON TIDE

Site promocional de um jogo de mundo aberto **fictício**, inspirado no estilo das grandes páginas de lançamento de jogos: intro com máscara de título que dá zoom, seções fixadas com rolagem, parallax, galeria horizontal e lightbox.

Todo o conteúdo é original: nome, personagens (Marisol Vega e Dex Calloway), locais (estado de Palmera, Coral City…), textos e ilustrações vetoriais.

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
| `assets/img/*.svg` | Ilustrações vetoriais (nítidas em qualquer resolução) |
| `tools/generate-art.mjs` | Gera as ilustrações: `node tools/generate-art.mjs` |
| `vendor/` | GSAP 3.12.5 e Lenis 1.1.13 |
| `assets/fonts/` | Anton e Inter (licença SIL OFL) |

## Trocar as imagens

Coloque suas próprias imagens (com direitos de uso) em `assets/img/` e troque os `src` / `data-full` no `index.html`. Para ficarem nítidas em telas grandes, use pelo menos 2560 px de largura (WebP ou AVIF).
