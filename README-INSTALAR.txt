PACOTE PWA - Minha Vida Financeira

O que tem aqui:
- Ícones prontos para celular e computador
- manifest.json
- service-worker.js
- pwa-register.js
- favicon.png
- Trechos para colar no index.html

Como usar:
1. Copie todos os arquivos e a pasta assets para a raiz do seu projeto.
   A raiz é onde estão index.html, styles.css e app.js.

2. Abra o index.html.

3. Dentro do <head>, cole o conteúdo do arquivo:
   COLOCAR_NO_HEAD_DO_INDEX.html

4. Antes de </body>, depois do script do app.js, cole o conteúdo do arquivo:
   COLOCAR_ANTES_DO_BODY_FECHAR.html

Exemplo do final do index.html:
<script src="app.js?v=11"></script>
<script src="pwa-register.js"></script>
</body>

5. Publique no GitHub Pages, Netlify ou outro alojamento HTTPS.

Como instalar:
- Android/Chrome: abrir o site e tocar em Instalar app ou Adicionar à tela inicial.
- iPhone/Safari: botão Compartilhar > Adicionar à Tela Inicial.
- Computador/Chrome ou Edge: ícone de instalar na barra do navegador.

Observação:
No computador e Android o botão de instalar aparece melhor quando o site está em HTTPS e com manifest + service worker ativos.
No iPhone o Safari usa principalmente o apple-touch-icon.
