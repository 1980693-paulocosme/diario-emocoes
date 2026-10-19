# Diário de Emoções

Aplicação web pessoal para registar, uma vez por dia, as emoções de um dia. Foi pensada para uma pessoa, no iPhone, com uma utilização simples: abrir, escolher as emoções, escrever uma nota se apetecer e guardar.

A versão 1.0 é uma Progressive Web App. Funciona no Safari e, depois de instalada, abre a partir do ecrã principal sem a barra do navegador. Não tem servidor, conta nem ligação a serviços externos. Os registos ficam no próprio telemóvel.

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

Nesta versão não há conta, lembretes, estatísticas, gráficos nem sugestões automáticas.

## Estrutura dos ficheiros

```text
/
├── index.html
├── style.css
├── app.js
├── storage.js
├── manifest.webmanifest
├── sw.js
├── README.md
├── .nojekyll
└── icons/
    ├── icon-192.png
    ├── icon-512.png
    └── apple-touch-icon.png
```

- `index.html`, `style.css` e `app.js` são a interface.
- `storage.js` lê e guarda os registos no LocalStorage.
- `manifest.webmanifest` permite instalar a aplicação.
- `sw.js` guarda os ficheiros da aplicação para abrir sem internet.
- `.nojekyll` evita que o GitHub Pages processe o site com Jekyll.
- `icons/` contém os ícones do ecrã principal.

Os caminhos são relativos, para o site poder viver em `https://USERNAME.github.io/diario-emocoes/` e não apenas na raiz do domínio.

## Publicar no GitHub Pages

1. Cria um repositório no GitHub. O nome `diario-emocoes` produz o endereço abaixo.
2. Envia estes ficheiros para o branch principal. Inclui a pasta `icons` e o ficheiro `.nojekyll`.
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

### Exportar

1. Abre **Definições**.
2. Toca em **Exportar o meu diário**.
3. No iPhone, usa a folha de partilha para guardar o ficheiro na aplicação Ficheiros, em iCloud Drive ou noutro sítio teu.
4. Se a partilha de ficheiros não estiver disponível, a aplicação transfere o ficheiro.

O nome do ficheiro é `diario-emocoes-YYYY-MM-DD.json`, com a data do dia em que exportas.

Convém exportar com regularidade e guardar essa cópia fora do Safari.

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
- Em casos raros, quando o telemóvel está sem espaço, o iOS pode remover dados de sites. Um ficheiro exportado é a proteção contra isso.
- Sem um ficheiro exportado, não há forma de recuperar registos apagados.
- A primeira abertura precisa de internet. Depois disso, a aplicação abre offline.
- A aplicação não cria registos para dias futuros.
- Não sincroniza entre dispositivos. Para mudares de telemóvel, exporta no antigo e importa no novo, depois de abrires lá a aplicação pelo menos uma vez.
- Não está na App Store. É uma aplicação web instalada a partir do Safari.

## Ver localmente

Na pasta que contém `diario-emocoes`:

```bash
python3 -m http.server 8765
```

Abre `http://localhost:8765/diario-emocoes/`.

Este endereço imita o subdiretório do GitHub Pages. Abrir o ficheiro diretamente, com `file://`, não chega: o navegador não carrega os módulos nem o Service Worker dessa forma.
