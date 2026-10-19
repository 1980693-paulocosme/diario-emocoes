# Diário de Emoções

Aplicação web pessoal para registar, uma vez por dia, as emoções de um dia. Foi pensada para uma pessoa, no iPhone, com uma utilização simples: abrir, escolher as emoções, escrever uma nota se apetecer e guardar.

A versão 1.1 é uma Progressive Web App. Funciona no Safari e, depois de instalada, abre a partir do ecrã principal sem a barra do navegador. Não tem servidor, conta nem ligação a serviços externos. Os registos ficam no próprio telemóvel.

## Funcionalidades da versão 1.1

- Exportação de um relatório PDF, para partilhar com a psicóloga.
- O PDF é criado no próprio iPhone, a partir dos registos já guardados. Nada é enviado para um servidor.
- Escolha do período: últimos 7 dias, últimos 30 dias, todo o histórico ou um intervalo de datas.
- O relatório tem um resumo das emoções, um mapa semanal e os registos diários com as notas.

## Funcionalidades da versão 1.0

- Registo do dia com uma ou várias emoções, entre 25 emoções definidas.
- Nota opcional sobre o dia.
- Um registo por data, que pode ser alterado.
- Calendário mensal, com a semana a começar à segunda-feira.
- Consulta e edição de dias anteriores. Dias futuros não podem ser registados.
- Exportação do diário para um ficheiro JSON.
- Importação de um ficheiro JSON, com validação e confirmação antes de substituir os dados.
- Funcionamento offline depois da primeira visita com internet.
- Instalação no ecrã principal do iPhone.

Não há conta, lembretes, gráficos nem sugestões automáticas. O relatório PDF conta em quantos dias cada emoção foi escolhida. Não faz diagnósticos nem interpreta o estado emocional.

## Estrutura dos ficheiros

```text
/
├── index.html
├── style.css
├── app.js
├── storage.js
├── pdf.js
├── manifest.webmanifest
├── sw.js
├── README.md
├── .nojekyll
├── vendor/
│   ├── jspdf.umd.min.js
│   ├── jspdf.LICENSE.txt
│   ├── diario-sans-regular.js
│   ├── diario-sans-bold.js
│   └── OFL.txt
└── icons/
    ├── icon-192.png
    ├── icon-512.png
    └── apple-touch-icon.png
```

- `index.html`, `style.css` e `app.js` são a interface.
- `storage.js` lê e guarda os registos no LocalStorage.
- `pdf.js` cria o relatório PDF no dispositivo. Usa `vendor/jspdf.umd.min.js` e a fonte em `vendor/diario-sans-*.js`.
- `manifest.webmanifest` permite instalar a aplicação.
- `sw.js` guarda os ficheiros da aplicação para abrir sem internet.
- `.nojekyll` evita que o GitHub Pages processe o site com Jekyll.
- `icons/` contém os ícones do ecrã principal.

Os caminhos são relativos, para o site poder viver em `https://USERNAME.github.io/diario-emocoes/` e não apenas na raiz do domínio.

## Publicar no GitHub Pages

1. Cria um repositório no GitHub. O nome `diario-emocoes` produz o endereço abaixo.
2. Envia estes ficheiros para o branch principal. Inclui as pastas `icons` e `vendor`, e o ficheiro `.nojekyll`.
3. No repositório, abre **Settings → Pages**.
4. Em **Build and deployment**, escolhe **Deploy from a branch**.
5. Escolhe o branch principal e a pasta **/ (root)**. Guarda.
6. Depois de publicado, o endereço fica `https://USERNAME.github.io/diario-emocoes/`.

Abre esse endereço no Safari do iPhone, com internet, pelo menos uma vez. Essa visita guarda os ficheiros no telemóvel e permite abrir a aplicação mais tarde sem ligação.

## Adicionar ao ecrã principal do iPhone

1. Abre o endereço da aplicação no Safari.
2. Toca no botão **Partilhar**.
3. Toca em **Adicionar ao Ecrã Principal**.
4. Confirma o nome. A sugestão é **Emoções**.
5. Abre a aplicação pelo ícone novo.

A aplicação passa a abrir em ecrã inteiro. O ícone é um coração sobre um fundo pastel.

## Armazenamento local

Os registos são guardados apenas neste dispositivo, na memória local do Safari, sob a chave `diario_emocoes_v1`.

Cada dia usa a data local do telemóvel, no formato `YYYY-MM-DD`:

```json
{
  "2026-10-19": {
    "emocoes": ["Felicidade", "Gratidão", "Ansiedade"],
    "notas": "Foi um dia especial."
  }
}
```

Nada disto é enviado para o GitHub nem para qualquer outro serviço. Atualizar a aplicação não apaga os registos, porque o código e os dados estão separados.

O diário não passa sozinho para outro telemóvel, outro navegador ou um computador. Cada um tem a sua própria cópia, só se a importares.

## Exportar e importar o diário

Há duas exportações, com funções diferentes.

- **PDF** é um relatório para ler ou partilhar, por exemplo com a psicóloga. Não serve para repor o diário.
- **JSON** é a cópia de segurança. É este ficheiro que se importa noutro dispositivo.

### Exportar PDF

1. Abre **Definições**.
2. Toca em **Exportar PDF**.
3. Escolhe o período. Por defeito ficam os últimos 30 dias. Em **Personalizado**, indica a data inicial e a data final.
4. Toca em **Gerar relatório PDF**.
5. No iPhone, se a partilha de ficheiros estiver disponível, usa a folha de partilha para guardar o PDF na aplicação Ficheiros ou enviá-lo.
6. Se a partilha não estiver disponível, a aplicação transfere o ficheiro.

O nome do ficheiro é `diario-emocoes-AAAA-MM-DD.pdf`, com a data do dia em que o relatório é criado.

O PDF inclui o período, o número de dias com registo, uma tabela com as emoções e a respetiva contagem, um mapa de cada semana com registos e o texto das notas. Não inclui dias sem registo. Se o período não tiver registos, a aplicação avisa e não cria um ficheiro vazio.

O relatório é gerado no telemóvel. Os registos não são enviados para a internet para produzir o PDF, nem ficam guardados no repositório.

### Exportar JSON

1. Abre **Definições**.
2. Toca em **Exportar JSON**.
3. No iPhone, usa a folha de partilha para guardar o ficheiro na aplicação Ficheiros, em iCloud Drive ou noutro sítio teu.
4. Se a partilha de ficheiros não estiver disponível, a aplicação transfere o ficheiro.

O nome do ficheiro é `diario-emocoes-YYYY-MM-DD.json`, com a data do dia em que exportas. A estrutura do ficheiro e a chave `diario_emocoes_v1` mantêm-se, para um JSON exportado antes desta versão continuar a poder ser importado.

Convém exportar o JSON com regularidade e guardar essa cópia fora do Safari.

### Importar

1. Abre **Definições**.
2. Toca em **Importar diário**.
3. Escolhe um ficheiro JSON na aplicação Ficheiros.
4. A aplicação só continua se o ficheiro for JSON válido, com datas corretas e emoções da lista suportada.
5. Se o ficheiro não servir, os registos atuais mantêm-se.
6. Se servir, aparece um pedido de confirmação. **Cancelar** não altera nada. **Importar e substituir** troca o diário deste dispositivo pelo conteúdo do ficheiro.

A importação substitui os registos deste dispositivo. Não junta os dois diários.

## Limitações e cuidados

- Os dados existem só neste iPhone e neste Safari. Não há cópia na nuvem da aplicação.
- Apagar os dados do site, limpar o histórico e os dados dos sites, ou usar o modo privado pode apagar o diário.
- Em casos raros, quando o telemóvel está sem espaço, o iOS pode remover dados de sites. Um ficheiro JSON exportado é a proteção contra isso. O PDF não substitui essa cópia.
- Sem um ficheiro exportado, não há forma de recuperar registos apagados.
- A primeira abertura precisa de internet. Depois disso, a aplicação abre offline.
- A aplicação não cria registos para dias futuros.
- Não sincroniza entre dispositivos. Para mudares de telemóvel, exporta no antigo e importa no novo, depois de abrires lá a aplicação pelo menos uma vez.
- Não está na App Store. É uma aplicação web instalada a partir do Safari.
- O PDF usa uma fonte com os caracteres do português. Símbolos que essa fonte não inclui, como emojis escritos nas notas, não aparecem no relatório. O resto da nota mantém-se.
- No Safari e na aplicação instalada, a folha de partilha do PDF depende do iPhone suportar a partilha de ficheiros. Quando não suporta, o ficheiro é transferido.
- A criação do PDF pode demorar um instante se o período tiver muitas notas longas. Convém manter a aplicação aberta até aparecer a partilha ou a transferência.

## Bibliotecas incluídas

O relatório PDF usa [jsPDF](https://github.com/parallax/jsPDF) 2.5.2, licença MIT. A cópia está em `vendor/jspdf.umd.min.js` e a licença em `vendor/jspdf.LICENSE.txt`. É uma versão completa, sem dependências externas em runtime, para funcionar no Safari. Não é carregada de uma CDN: faz parte da aplicação e funciona offline, depois da primeira visita com internet.

Os caracteres portugueses usam um subconjunto da fonte Source Sans 3, da Adobe, sob a [SIL Open Font License 1.1](vendor/OFL.txt). O nome reservado Source não é usado neste subconjunto: dentro do PDF a fonte chama-se Diario Sans. Os ficheiros `vendor/diario-sans-regular.js` e `vendor/diario-sans-bold.js` só contêm os glifos necessários ao texto do relatório.

## Ver localmente

Na pasta que contém `diario-emocoes`:

```bash
python3 -m http.server 8765
```

Abre `http://localhost:8765/diario-emocoes/`.

Este endereço imita o subdiretório do GitHub Pages. Abrir o ficheiro diretamente, com `file://`, não chega: o navegador não carrega os módulos nem o Service Worker dessa forma.
