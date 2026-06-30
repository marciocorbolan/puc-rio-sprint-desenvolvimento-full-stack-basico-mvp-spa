# PUC RIO - Desenvolvimento Full Stack Básico - MVP - Blog SPA

Este projeto é o MVP da sprint de Desenvolvimento Full Stack Básico, focado na construção de um SPA.

* Foco desta entrega: Desenvolvimento exclusivo da camada de interface (Frontend SPA), responsável pela interatividade, roteamento virtual e consumo dos serviços RESTful.
* Integração: Este componente foi projetado para consumir a API RESTful desenvolvida na etapa anterior, garantindo uma comunicação fluida entre os endpoints de persistência de dados e a experiência do usuário.

---

## 📋 Funcionalidades

* **Navegação sem refresh:** Manipulação dinâmica de elementos (seções/divs) para alternância de conteúdo sem recarregamento da página.
* **Comunicação REST:** Integração total com a API para operações de autenticação (JWT) e CRUD (Blogs, Postagens e Comentários).
* **Interface Dinâmica:**
    * **Home:** Exibição com layout customizado, incluindo cabeçalho visual, box de boas-vindas e grid de postagens.
    * **Busca em Tempo Real:** Barra de pesquisa integrada que consome filtros da API para localizar postagens por título.
    * **Autenticação:** Sistema de controle de acesso (Login/Registro) com persistência de token JWT e alternância contextual do menu.
    * **Área Logada:** Gestão completa de blogs e postagens, com suporte a criação e edição de conteúdos.

---

## 🛠️ Estrutura do Projeto

```text
puc-rio-sprint-desenvolvimento-full-stack-basico-mvp-spa/
├── css/
│   └── style.css          # Regras de estilização personalizadas e layout responsivo
├── js/
│   ├── api.js             # Módulo de serviço: consumo de endpoints REST (fetch + JWT)
│   ├── app.js             # Orquestrador da SPA (gerenciamento de rotas e estado)
│   └── ui.js              # Funções de renderização dinâmica de componentes (DOM)
├── assets/                # Imagens e ativos visuais
└── index.html             # Ponto de entrada único (SPA)
```

### 📦 Pacotes

* **Bootstrap (v5.x):** Utilizado para a estrutura do sistema de grid responsivo, componentes de UI e utilitários de estilização.
* **Font Awesome:** Biblioteca utilizada via CDN para a inclusão de ícones na interface.
* **JWT-decode:** Biblioteca utilizada para manipular e decodificar tokens JWT armazenados no localStorage.  

### 🧠 Fluxo de Execução Técnica

A aplicação processa a interação do usuário através de camadas integradas:
* **Infraestrutura:** O navegador carrega o index.html e o app.js orquestra a SPA, gerenciando o estado da aplicação e as rotas virtuais sem recarregamento.
* **Camada de Interface:** O Bootstrap (via CDN) gerencia a estrutura responsiva e os componentes visuais, enquanto o JavaScript nativo manipula o DOM para renderizar o conteúdo dinamicamente.
* **Camada de Autenticação e Dados:** A aplicação utiliza o localStorage para persistência, a biblioteca JWT-decode para a validação contextual do usuário, e o módulo de serviço api.js para realizar requisições assíncronas (via fetch) aos endpoints RESTful.

### ⚙️ Ferramentas de Desenvolvimento
* **Visual Studio Code:** `sudo snap install code --classic`
* **Git:** `sudo apt install git -y`

---

## 💻 Projeto

### 1. Clonar o repositório
~~~bash
git clone https://github.com/marciocorbolan/puc-rio-sprint-desenvolvimento-full-stack-basico-mvp-spa.git
cd puc-rio-sprint-desenvolvimento-full-stack-basico-mvp-spa
~~~

### 2. Requisito básicos

Por ser uma aplicação SPA desenvolvida em HTML/CSS/JS puro, não é necessário configurar servidores locais ou ambientes complexos.

### 3. Acesso ao projeto 🚀

* Certifique-se de que a API backend esteja em execução para permitir o consumo dos dados.
* Abra o arquivo index.html diretamente em qualquer navegador moderno (Chrome, Firefox, Edge).

---

## 👤 Autor
* Márcio Corbolan - Desenvolvedor Principal

---

## 📄 Licença

Este projeto está sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.
