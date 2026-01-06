# School Projects Portfolio (Static)

学校で取り組んだプロジェクト（Hanabi / まるごと祭 / Podcast部 / Vision Mash UP / TEDx Kamiyama）を整理したポートフォリオサイト。

## Features
- Responsive (mobile / tablet / desktop)
- Chrome / Safari layout safety
- Projects filter + search + sort
- URL sync (?tag=...&q=...&project=...)
- Modal detail
- Contact form (Formspree想定)

## Setup
このサイトは `fetch` で `assets/projects.json` を読み込むため、ローカル確認は簡易サーバー推奨。

### Local preview
```bash
# macOS / Linux
python3 -m http.server 5500

# Windows
py -m http.server 5500
