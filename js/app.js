/***************************************************************************************/
/* VARIAVEIS GLOBAIS                                                                   */
/***************************************************************************************/

let blogIdContextoAtual = null;

// Controle de paginaa para o blog
let blogCurrentPage = 1;
let blogLoading = false;
let blogHasMore = true;
const blogPerPage = 6;
let exibirTodosOsBlogs = false;

// Controle de paginaa para a postagem
let postCurrentPage = 1;
let postLoading = false;
let postHasMore = true;
const postPerPage = 6;

/***************************************************************************************/
/* INICIALIZAÇÃO DA SPA                                                                */
/***************************************************************************************/

document.addEventListener('DOMContentLoaded', async () => {
    // Verifica se já está logado
    if (localStorage.getItem('token')) {
        atualizarNavbarLogado();
    }

    /***********************************************************************************/
    
    // Carrega e renderiza usando a função que contém a lógica de mensagem de ausência
    const latestPosts = await fetchPosts('', 1, 6); 
    renderPostsLatest(latestPosts);

    /***********************************************************************************/

    // Configurar o campo de busca para filtrar posts
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        const buscarPostsComDebounce = debounce(async (termo) => {
            const filteredPosts = await fetchPosts(termo);
            renderPostsLista(filteredPosts);
            navigateTo('posts', true);
        }, 300);

        searchInput.addEventListener('input', (e) => {
            buscarPostsComDebounce(e.target.value);
        });
    }

    /***********************************************************************************/

    // Configurar o formulário de login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); 
            await executarLogin();
        });
    }

    /***********************************************************************************/

    // Configurar o formulário de cadastro
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault(); 
            await executarCadastro();
        });
    }

    /***********************************************************************************/
    
    // Configurar o formulário de atualização de perfil
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await executarAtualizacaoPerfil();
        });
    }

    /***********************************************************************************/
    
    // Configurar o formulário de criação de blog
    const blogForm = document.getElementById('blog-form');
    if (blogForm) {
        blogForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await executarCriacaoEdicaoBlog();
        });
    }
    
    const btnCriarBlog = document.querySelector('[data-bs-target="#blogModal"]');
    if (btnCriarBlog) {
        btnCriarBlog.addEventListener('click', () => {
            document.getElementById('blogModalLabel').innerText = "Criar novo blog";
            document.getElementById('blog-id').value = ""; // Garante que o ID está vazio
            document.getElementById('blog-form').reset();
            document.getElementById('blog-feedback').style.display = 'none';
        });
    }

    /***********************************************************************************/
    
    // Configurar o formulário de criação de post
    const postForm = document.getElementById('post-form');
    if (postForm) {
        postForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await executarCriacaoEdicaoPost();
        });
    }
    
    const btnCriarPost = document.querySelector('[data-bs-target="#postModal"]');
    if (btnCriarPost) {
        btnCriarPost.addEventListener('click', () => {
            document.getElementById('postModalLabel').innerText = "Criar novo post";
            if (blogIdContextoAtual) {
                document.getElementById('blog-id').value = blogIdContextoAtual;
            }
            document.getElementById('post-id').value = ""; // Garante que o ID está vazio
            document.getElementById('post-form').reset();
            document.getElementById('post-feedback').style.display = 'none';
        });
    }

    /***********************************************************************************/

    // Vincula a máscara em tempo real a todos os campos de CPF/CNPJ de uma só vez
    const camposComMascara = document.querySelectorAll('#login-cpfcnpj, #register-cpfcnpj');
    camposComMascara.forEach(input => {
        input.addEventListener('input', (e) => {
            e.target.value = formatarCpfCnpj(e.target.value);
        });
    });

    /***********************************************************************************/

    // Escuta o botão Voltar/Avançar do próprio navegador
    window.addEventListener('popstate', (e) => {
        // Se houver um estado salvo no histórico, navega para ele
        if (e.state && e.state.page) {
            navigateTo(e.state.page, true); // O 'true' aqui ativa o isPopState
        } else {
            // Caso contrário, volta para a home por padrão
            navigateTo('home', true);
        }
    });

    // Verifica qual página carregar logo na primeira abertura do site
    const params = new URLSearchParams(window.location.search);
    const paginaInicial = (params.get('page') || 'home');
    
    // Substitui o estado inicial vazio pelo estado da página atual
    history.replaceState({ page: paginaInicial }, "", window.location.search || `?page=home`);
    navigateTo(paginaInicial, true);
});

/***************************************************************************************/
/* CONTROLE DE INTERFACE DE USUÁRIO (UI)                                               */
/***************************************************************************************/

function atualizarNavbarLogado() {
    const authLoggedOut = document.getElementById('auth-logged-out');
    const authLoggedIn = document.getElementById('auth-logged-in');

    if (authLoggedOut && authLoggedIn) {
        authLoggedOut.classList.add('d-none');      // Esconde os botões Login/Cadastrar
        authLoggedIn.classList.remove('d-none');    // Mostra os botões do usuário logado
    }
}

/***************************************************************************************/

// Função de navegação para alternar entre seções da SPA
function navigateTo(viewId, isPopState = false) {
    const sections = ['home', 'meu-cadastro', 'blogs', 'posts'];
    sections.forEach(id => {
        const section = document.getElementById(id);
        if (section) section.style.display = 'none';
    });

    const targetSection = document.getElementById(viewId);
    if (targetSection) {
        targetSection.style.display = 'block';
    }
    
    // Proteção de rotas autenticadas
    if (viewId === 'meu-cadastro') {
        if (!localStorage.getItem('token')) {
            navigateTo('home');
            return;
        }
    }

    if (viewId === 'meu-cadastro') {
        carregarDadosPerfil();
    }

    if (viewId === 'blogs') {
        // Reseta os estados de paginação
        blogCurrentPage = 1;
        blogHasMore = true;
        blogLoading = false;
        
        if (!localStorage.getItem('token')) {
            exibirTodosOsBlogs = true;
        } else {
            exibirTodosOsBlogs = false; 
        }

        const grid = document.getElementById('blogs-grid');
        const msgVazio = document.getElementById('blogs-vazio');
        const msgFim = document.getElementById('blogs-fim');
        
        if (grid) {
            grid.innerHTML = '';
            grid.style.display = 'flex';
        }
        if (msgVazio) {
            msgVazio.style.display = 'none';
        }
        if (msgFim) {
            msgFim.style.display = 'none';
            msgFim.innerHTML = '';
        }
        
        configurarInterfaceBlogs();
        carregarMaisBlogs();
    }

    // Se a navegação NÃO veio do popstate (botão voltar/avançar), salva no histórico
    if (!isPopState) {
        // Altera a URL para algo como: index.html?page=meu-cadastro
        history.pushState({ page: viewId }, "", `?page=${viewId}`);
    }
}

/***************************************************************************************/
/* FLUXOS DE AUTENTICAÇÃO                                                              */
/***************************************************************************************/

async function executarLogin() {
    const form = document.getElementById('login-form');
    const botaoSubmit = document.querySelector('#login-form button[type="submit"]');
    const botaoSubmitTextoOriginal = (botaoSubmit ? botaoSubmit.innerHTML : "");
    
    const cpfcnpj = document.getElementById('login-cpfcnpj').value;
    const senha = document.getElementById('login-senha').value;

    // Remove a formatação (máscara) antes de enviar para o servidor
    const cpfcnpjLimpo = cpfcnpj.replace(/\D/g, "");

    // Validação básica de campos vazios
    if (!cpfcnpjLimpo || !senha) {
        exibirFeedback('login-feedback', "Por favor, preencha todos os campos.", "alert-warning");
        return;
    }

    // Validação cpfcnpj
    if ((cpfcnpjLimpo.length < 11) || (cpfcnpjLimpo.length > 14)) {
        exibirFeedback('login-feedback', "O CPF/CNPJ deve ter entre 11 e 14 dígitos.", "alert-warning");
        return;
    }

    // Desabilita o formulário e muda o texto do botão
    desativarFormulario(form);
    if (botaoSubmit) {
        botaoSubmit.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Entrando...`;
    }

    exibirFeedback('login-feedback', "Autenticando...", "alert-info");

    try {
        const response = await login(cpfcnpjLimpo, senha);

        if (response.ok) {
            exibirFeedback('login-feedback', "Login efetuado com sucesso!", "alert-success");
            atualizarNavbarLogado();
            
            setTimeout(() => {
                const modalElement = document.getElementById('loginModal');
                const modalInstance = bootstrap.Modal.getInstance(modalElement);
                if (modalInstance) modalInstance.hide();

                // Limpa o formulário e feedback
                const form = document.getElementById('login-form');
                if (form) form.reset();
                document.getElementById('login-feedback').style.display = 'none';

                restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
                reativarFormulario(form);
            }, 1000);
        } else {
            let mensagemErro = "Erro ao tentar fazer login. Tente novamente mais tarde.";
            
            try {
                const errorData = await response.json();
                mensagemErro = errorData.mensagem || errorData.error || errorData.message || mensagemErro;
            } catch (e) {
                // Caso o backend não retorne um JSON válido no erro, decide por status HTTP genéricos
                if ((response.status === 401) || (response.status === 403)) {
                    mensagemErro = "CPF/CNPJ ou senha incorretos.";
                }
            }

            exibirFeedback('login-feedback', mensagemErro, "alert-danger");
            restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
            reativarFormulario(form);
        }
    } catch (error) {
        exibirFeedback('login-feedback', "Falha ao se conectar com o servidor.", "alert-danger");
        restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
        reativarFormulario(form);
    }
}

/***************************************************************************************/

async function executarCadastro() {
    const form = document.getElementById('register-form');
    const botaoSubmit = document.querySelector('#register-form button[type="submit"]');
    const botaoSubmitTextoOriginal = (botaoSubmit ? botaoSubmit.innerHTML : "");

    const nome = document.getElementById('register-nome').value;
    const email = document.getElementById('register-email').value;
    const cpfcnpj = document.getElementById('register-cpfcnpj').value;
    const senha = document.getElementById('register-senha').value;

    const cpfcnpjLimpo = cpfcnpj.replace(/\D/g, "");

    // Validação básica de campos vazios
    if (!nome || !email || !cpfcnpjLimpo || !senha) {
        exibirFeedback('register-feedback', "Por favor, preencha todos os campos obrigatórios.", "alert-warning");
        return;
    }

    // Validação cpfcnpj
    if ((cpfcnpjLimpo.length < 11) || (cpfcnpjLimpo.length > 14)) {
        exibirFeedback('register-feedback', "O CPF/CNPJ deve ter entre 11 e 14 dígitos.", "alert-warning");
        return;
    }

    // Desabilita o formulário e muda o texto do botão
    desativarFormulario(form);
    if (botaoSubmit) {
        botaoSubmit.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processando...`;
    }

    exibirFeedback('register-feedback', "Cadastrando...", "alert-info");

    try {
        const response = await register(nome, email, cpfcnpjLimpo, senha);
        
        if ((response.status === 201) || response.ok) {
            exibirFeedback('register-feedback', "Cadastro criado com sucesso!", "alert-success");

            setTimeout(() => {
                const modalElement = document.getElementById('registerModal');
                const modalInstance = bootstrap.Modal.getInstance(modalElement);
                if (modalInstance) modalInstance.hide();
                
                // Limpa o formulário e feedback
                const form = document.getElementById('register-form');
                if (form) form.reset();
                document.getElementById('register-feedback').style.display = 'none';
                
                // Abre o modal de login para facilitar o fluxo do usuário
                const loginModalElement = document.getElementById('loginModal');
                const loginModal = new bootstrap.Modal(loginModalElement);
                loginModal.show();

                restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
                reativarFormulario(form);
            }, 1000);
        } else if (response.status === 400) {
            const errorData = await response.json();
            const mensagemErro = errorData.mensagem || errorData.error || errorData.message || "Erro de validação nos dados enviados.";

            exibirFeedback('register-feedback', mensagemErro, "alert-danger");
            restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
            reativarFormulario(form);
        } else {
            exibirFeedback('register-feedback', "Erro ao realizar o cadastro. Verifique as informações.", "alert-danger");
            restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
            reativarFormulario(form);
        }
    } catch (error) {
        exibirFeedback('register-feedback', "Falha ao se conectar com o servidor.", "alert-danger");
        restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
        reativarFormulario(form);
    }
}

/***************************************************************************************/
/* FLUXOS DE PERFIL                                                                    */
/***************************************************************************************/

async function carregarDadosPerfil() {
    try {
        const response = await fetchUserProfile();
        if (response.ok) {
            const data = await response.json();
            const profNome = document.getElementById('profile-nome');
            const profEmail = document.getElementById('profile-email');
            
            if (profNome) profNome.value = data.nome || '';
            if (profEmail) profEmail.value = data.email || '';
        } else if (response.status === 401) {
            executarLogout();
        }
    } catch (error) {
        exibirFeedback('profile-feedback', "Falha ao se conectar com o servidor.", "alert-danger");
    }
}

/***************************************************************************************/

async function executarAtualizacaoPerfil() {
    const form = document.getElementById('profile-form');
    const botaoSubmit = document.querySelector('#profile-form button[type="submit"]');
    const botaoSubmitTextoOriginal = (botaoSubmit ? botaoSubmit.innerHTML : "");

    const nome = document.getElementById('profile-nome').value;
    const email = document.getElementById('profile-email').value;
    const senha = document.getElementById('profile-senha').value;

    // Desabilita o formulário e muda o texto do botão
    desativarFormulario(form);
    if (botaoSubmit) {
        botaoSubmit.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Salvando...`;
    }

    exibirFeedback('profile-feedback', "Atualizando cadastro...", "alert-info");

    try {
        const response = await updateUserProfile(nome, email, senha || undefined);
        
        if (response.ok) {
            exibirFeedback('profile-feedback', "Cadastro atualizado com sucesso!", "alert-success");

            // Limpa o campo de senha por segurança
            const profSenha = document.getElementById('profile-senha');
            if (profSenha) profSenha.value = '';
        } else if (response.status === 400) {
            const errorData = await response.json();
            const mensagemErro = errorData.mensagem || errorData.error || errorData.message || "Erro de validação ao atualizar dados.";

            exibirFeedback('profile-feedback', mensagemErro, "alert-danger");
            restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
            reativarFormulario(form);
        } else if (response.status === 401) {
            executarLogout();
        } else {
            exibirFeedback('profile-feedback', "Erro ao atualizar o perfil. Verifique os dados inseridos.", "alert-danger");
            restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
            reativarFormulario(form);
        }
    } catch (error) {
        exibirFeedback('profile-feedback', "Falha ao se conectar com o servidor.", "alert-danger");
        restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
        reativarFormulario(form);
    }
}

/***************************************************************************************/

function exibirFeedback(targetId, mensagem, classe) {
    const feedbackDiv = document.getElementById(targetId);
    if (!feedbackDiv) return;
    feedbackDiv.className = `alert ${classe}`;
    feedbackDiv.innerText = mensagem;
    feedbackDiv.style.display = 'block';
}

/***************************************************************************************/

function executarLogout() {
    // Remove o token do localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user_id');

    // Atualiza a página
    window.location.reload();
}

/***************************************************************************************/
/* FLUXOS DE BLOGS                                                                     */
/***************************************************************************************/

async function carregarMaisBlogs() {
    if (blogLoading || !blogHasMore) return;

    blogLoading = true;
    
    const grid = document.getElementById('blogs-grid');
    const msgFim = document.getElementById('blogs-fim');

    const msgFimTexto = "✨ Todos os cadastros foram carregados.";

    const spinnerId = 'blog-scroll-spinner';
    if (grid && !document.getElementById(spinnerId)) {
        grid.insertAdjacentHTML('beforeend', `
            <div id="${spinnerId}" class="col-12 text-center my-3">
                <div class="spinner-border text-primary" role="status"></div>
            </div>
        `);
    }

    try {
        const loggedUserId = exibirTodosOsBlogs ? '' : (localStorage.getItem('user_id') || '');
        const blogs = await fetchBlogs(loggedUserId, blogCurrentPage, blogPerPage);
        
        const spinner = document.getElementById(spinnerId);
        if (spinner) spinner.remove();

        if (!blogs || !Array.isArray(blogs) || (blogs.length === 0)) {
            blogHasMore = false;

            if (blogCurrentPage === 1) {
                renderBlogsVazio();
            } else if (msgFim) {
                msgFim.innerHTML = msgFimTexto;
                msgFim.style.display = 'block';
            }
            return; // Interrompe o fluxo aqui para não executar o assistente abaixo
        }

        renderBlogsLista(blogs);

        if (blogs.length < blogPerPage) {
            blogHasMore = false;

            if (msgFim) {
                msgFim.innerHTML = msgFimTexto;
                msgFim.style.display = 'block';
            }
        }

        blogCurrentPage++; 

        setTimeout(() => {
            if (blogHasMore && !blogLoading && document.documentElement.scrollHeight <= window.innerHeight) {
                carregarMaisBlogs();
            }
        }, 300);
    } catch (error) {
        const spinner = document.getElementById(spinnerId);
        if (spinner) spinner.remove();
        console.error("Erro ao processar scroll de blogs:", error);

        if (blogCurrentPage > 1) {
            if (msgFim) {
                msgFim.innerHTML = msgFimTexto;
                msgFim.style.display = 'block';
            }
        } else {
            const msgVazio = document.getElementById('blogs-vazio');
            if (msgVazio) {
                msgVazio.innerHTML = `
                    <div class="col-12 text-danger">
                        <h4>⚠️ Não foi possível carregar seus blogs</h4>
                        <p class="small text-muted">Verifique sua conexão com o servidor ou o formato de resposta.</p>
                    </div>
                `;
                msgVazio.style.display = 'flex';
            }
        }
    } finally {
        if (!blogHasMore) {
            blogLoading = true; // Mantém "travado" para recusar novos scrolls fantasmas
        } else {
            blogLoading = false;
        }
    }
}

/***************************************************************************************/

function renderBlogsLista(blogs) {
    const grid = document.getElementById('blogs-grid');
    const msgVazio = document.getElementById('blogs-vazio');
    if (!grid) return;

    if (blogs && (blogs.length > 0)) {
        if (msgVazio) msgVazio.style.display = 'none';
        grid.style.display = 'flex';
    }

    const currentUserId = localStorage.getItem('user_id');

    const htmlBlogs = blogs.map(blog => {
        let estiloBackground = '';
        if (blog.image && blog.image.trim() !== '') {
            const urlImagem = blog.image.startsWith('data:') 
                ? blog.image 
                : `data:image/jpeg;base64,${blog.image}`;
                
            estiloBackground = `style="background-image: linear-gradient(rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.85)), url('${urlImagem}'); background-size: cover; background-position: center;"`;
        }

        // Condicional para exibir o botão Editar apenas se o blog pertencer ao usuário logado
        // Certifique-se que sua API retorna a propriedade "user_id" no objeto blog para a comparação funcionar corretamente.
        const ehDonoDoBlog = currentUserId && (String(blog.user_id) === String(currentUserId));
        
        const botaoEditar = ehDonoDoBlog ? `
            <button class="btn btn-sm btn-outline-secondary" 
                    onclick="abrirBlogModal(${blog.id}, '${formataTextoModal(blog.nome)}')">
                Editar
            </button>
        ` : '';

        const tituloTamanhoMaximo = 35;
        const tituloCapitalizado = blog.nome.charAt(0).toUpperCase() + blog.nome.slice(1).toLowerCase();
        const tituloFormatado = (tituloCapitalizado.length > tituloTamanhoMaximo) 
            ? (tituloCapitalizado.substring(0, tituloTamanhoMaximo) + "...") 
            : tituloCapitalizado;

        return `
            <div class="col-md-4 mb-4">
                <div class="card h-100" ${estiloBackground}>
                    <div class="card-body d-flex flex-column justify-content-between">
                        <div>
                            <h5 class="card-title fw-bold">${formataTextoModal(tituloFormatado)}</h5>
                            <p class="card-text text-muted small">ID: #${blog.id}</p>
                        </div>
                        <div class="d-flex gap-2 mt-3">
                            <a href="javascript:void(0)" class="btn btn-sm btn-custom-site" onclick="irParaPostsDoBlog(${blog.id})">Ver</a>
                            ${botaoEditar}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    grid.insertAdjacentHTML('beforeend', htmlBlogs);
}

/***************************************************************************************/

function irParaPostsDoBlog(blogId) {
    blogIdContextoAtual = blogId;

    // Reseta paginação de posts para o novo post
    postCurrentPage = 1;
    postHasMore = true;
    postLoading = false;
    
    const grid = document.getElementById('posts-grid');
    if (grid) grid.innerHTML = ''; // Limpa os posts anteriores
    
    navigateTo('posts');
    carregarMaisPosts(blogId); // Carrega os posts específicos deste blog
}

/***************************************************************************************/

function abrirBlogModal(id, nome) {
    document.getElementById('blogModalLabel').innerText = "Editar blog";
    document.getElementById('blog-id').value = id;
    document.getElementById('blog-nome').value = nome;
    document.getElementById('blog-imagem-file').value = "";
    document.getElementById('blog-feedback').style.display = 'none';

    const modalElement = document.getElementById('blogModal');
    const modalInstance = new bootstrap.Modal(modalElement);
    modalInstance.show();
}

/***************************************************************************************/

function renderBlogsVazio() {
    const grid = document.getElementById('blogs-grid');
    const msgVazio = document.getElementById('blogs-vazio');
    
    if (grid) grid.style.display = 'none';
    if (msgVazio) msgVazio.style.display = 'flex';
}

/***************************************************************************************/

function configurarInterfaceBlogs() {
    const token = localStorage.getItem('token');
    const btnCriar = document.getElementById('btn-criar-novo-blog');
    const btnVerTodos = document.getElementById('btn-ver-todos-blogs');
    const tituloPagina = document.getElementById('blogs-page-title');
    const subTituloPagina = document.getElementById('blogs-page-subtitle');
    const vazioTitulo = document.getElementById('blogs-vazio-titulo');
    const vazioSubtitulo = document.getElementById('blogs-vazio-subtitulo');

    if (!token) {
        // Usuário deslogado vendo blogs globais
        if (btnCriar) btnCriar.classList.add('d-none');
        if (btnVerTodos) btnVerTodos.classList.add('d-none');
        if (tituloPagina) tituloPagina.innerText = "Blogs";
        if (subTituloPagina) subTituloPagina.innerText = "Explore publicações e conteúdos de nossos autores";
        if (vazioTitulo) vazioTitulo.innerText = "Nenhum blog encontrado";
        if (vazioSubtitulo) vazioSubtitulo.innerText = "Não há blogs registrados na plataforma atualmente.";
    } else {
        // Usuário logado
        if (exibirTodosOsBlogs) {
            // Logado vendo feed global
            if (btnCriar) btnCriar.classList.remove('d-none');
            if (btnVerTodos) {
                btnVerTodos.classList.remove('d-none');
                btnVerTodos.innerText = "Ver meus blogs";
                btnVerTodos.className = "btn btn-outline-secondary px-4 py-2 fw-semibold";
            }
            if (tituloPagina) tituloPagina.innerText = "Todos os blogs";
            if (subTituloPagina) subTituloPagina.innerText = "Explorando a comunidade";
            if (vazioTitulo) vazioTitulo.innerText = "Nenhum blog encontrado";
            if (vazioSubtitulo) vazioSubtitulo.innerText = "Não há blogs cadastrados no sistema.";
        } else {
            // Logado vendo apenas os seus blogs
            if (btnCriar) btnCriar.classList.remove('d-none');
            if (btnVerTodos) {
                btnVerTodos.classList.remove('d-none');
                btnVerTodos.innerText = "Ver todos os blogs";
                btnVerTodos.className = "btn btn-outline-secondary px-4 py-2 fw-semibold";
            }
            if (tituloPagina) tituloPagina.innerText = "Meus blogs";
            if (subTituloPagina) subTituloPagina.innerText = "Gerencie suas publicações e conteúdos";
            if (vazioTitulo) vazioTitulo.innerText = "Você ainda não possui blog cadastrado";
            if (vazioSubtitulo) vazioSubtitulo.innerText = "Crie seu primeiro blog para começar a publicar.";
        }
    }
}

/***************************************************************************************/

function alternarModoVisualizacaoBlogs(pressionouBotao = true) {
    if (!localStorage.getItem('token')) return;

    // Inverte o estado atual
    exibirTodosOsBlogs = !exibirTodosOsBlogs;

    // Reseta paginação para recarregar a nova lista
    blogCurrentPage = 1;
    blogHasMore = true;
    blogLoading = false;

    const grid = document.getElementById('blogs-grid');
    if (grid) grid.innerHTML = '';

    const msgFim = document.getElementById('blogs-fim');
    if (msgFim) {
        msgFim.style.display = 'none';
        msgFim.innerHTML = '';
    }

    configurarInterfaceBlogs();
    carregarMaisBlogs();
}

/***************************************************************************************/

async function executarCriacaoEdicaoBlog() {
    const form = document.getElementById('blog-form');
    const botaoSubmit = document.querySelector('#blog-form button[type="submit"]');
    const botaoSubmitTextoOriginal = (botaoSubmit ? botaoSubmit.innerHTML : "");

    const blogId = document.getElementById('blog-id').value;
    const nome = document.getElementById('blog-nome').value;
    const inputImagem = document.getElementById('blog-imagem-file');

    // Validação básica de campos vazios
    if (!nome) {
        exibirFeedback('blog-feedback', "Por favor, preencha todos os campos obrigatórios.", "alert-warning");
        return;
    }

    // Desabilita o formulário e muda o texto do botão
    desativarFormulario(form);
    if (botaoSubmit) {
        botaoSubmit.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Salvando...`;
    }

    const modoEdicao = (blogId !== "");
    exibirFeedback('blog-feedback', "Salvando...", "alert-info");

    try {
        let imagemBase64 = '';

        // Verifica se o usuário selecionou algum arquivo
        if (inputImagem && inputImagem.files && inputImagem.files[0]) {
            try {
                // Aguarda a conversão do arquivo para Base64
                imagemBase64 = await converterArquivoParaBase64(inputImagem.files[0]);
            } catch (erroConversao) {
                exibirFeedback('blog-feedback', "Erro ao processar o arquivo de imagem.", "alert-danger");
                restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
                reativarFormulario(form);
                return;
            }
        }

        let response;

        // Passa a string Base64 obtida para a função original da API
        if (modoEdicao) {
            response = await updateBlog(blogId, nome, imagemBase64 || undefined);
        } else {
            response = await createBlog(nome, imagemBase64 || undefined);
        }

        if ((response.status === 200) || (response.status === 201) || response.ok) {
            exibirFeedback('blog-feedback', ("Cadastro " + (modoEdicao ? "atualizado" : "criado") + " com sucesso!"), "alert-success");

            setTimeout(() => {
                // Fecha o modal
                const modalElement = document.getElementById('blogModal');
                const modalInstance = bootstrap.Modal.getInstance(modalElement);
                if (modalInstance) modalInstance.hide();

                // Reseta o formulário
                const form = document.getElementById('blog-form');
                if (form) form.reset();
                document.getElementById('blog-feedback').style.display = 'none';

                restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
                reativarFormulario(form);

                // Recarrega a seção de blogs limpando a paginação para exibir o novo item
                navigateTo('blogs');
            }, 1000);
        } else if (response.status === 401) {
            executarLogout();
        }  else if (response.status === 400) {
            const errorData = await response.json();
            const mensagemErro = errorData.mensagem || errorData.error || errorData.message || "Erro de validação nos dados enviados.";

            exibirFeedback('blog-feedback', mensagemErro, "alert-danger");
            restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
            reativarFormulario(form);
        } else {
            exibirFeedback('blog-feedback', "Erro ao realizar o cadastro. Verifique as informações.", "alert-danger");
            restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
            reativarFormulario(form);
        }
    } catch (error) {
        exibirFeedback('blog-feedback', "Falha ao se conectar com o servidor.", "alert-danger");
        restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
        reativarFormulario(form);
    }
}

/***************************************************************************************/
/* FLUXOS DE POST                                                                      */
/***************************************************************************************/

async function carregarMaisPosts(blogId = '') {
    if (postLoading || !postHasMore) return;

    postLoading = true;
    const grid = document.getElementById('posts-blog-grid');
    
    const spinnerId = 'post-scroll-spinner';
    if (grid && !document.getElementById(spinnerId)) {
        grid.insertAdjacentHTML('beforeend', `<div id="${spinnerId}" class="col-12 text-center my-3"><div class="spinner-border text-primary"></div></div>`);
    }

    try {
        const posts = await fetchPosts(blogId, postCurrentPage, postPerPage);
        document.getElementById(spinnerId)?.remove();

        if (!posts || posts.length === 0) {
            postHasMore = false;
            renderPostsLista([]);
            return;
        }

        // Renderiza no grid de posts do blog
        renderPostsLista(posts); 
        
        if (posts.length < postPerPage) postHasMore = false;
        postCurrentPage++;
    } catch (error) {
        document.getElementById(spinnerId)?.remove();
        console.error("Erro ao carregar posts:", error);
    } finally {
        postLoading = false;
    }
}

/***************************************************************************************/

function renderPostsLatest(posts) {
    // Apontando para o grid da Home conforme solicitado
    const grid = document.getElementById('posts-latest-grid');
    if (!grid) return;
    
    // Verificação de lista vazia com o design original que você forneceu
    if (posts.length === 0) {
        grid.innerHTML = `
            <div class="col-12 d-flex flex-column align-items-center justify-content-center text-center py-5 my-4">
                <div class="mb-3 text-secondary" style="font-size: 3rem;">📭</div>
                <h4 class="fw-bold text-dark mb-1">Nenhuma postagem encontrada</h4>
                <p class="text-muted small mb-0">Tente refinar sua busca ou volte mais tarde para ler novas histórias.</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = posts.map(post => `
        <div class="col-md-4 mb-4">
            <div class="card h-100">
                <div class="card-body">
                    <h5 class="card-title">${formataTextoModal(post.titulo)}</h5>
                    <p class="card-text">${formataTextoModal(post.conteudo.substring(0, 100))}...</p>
                </div>
            </div>
        </div>
    `).join('');
}

/***************************************************************************************/

function renderPostsLista(posts) {
    const grid = document.getElementById('posts-grid');
    const msgVazio = document.getElementById('posts-vazio');
    if (!grid) return;

    if (grid) grid.innerHTML = '';

    if (!posts || posts.length === 0) {
        if (msgVazio) msgVazio.style.display = 'block';
        if (grid) grid.style.display = 'none';
        return;
    }

    if (msgVazio) msgVazio.style.display = 'none';
    if (grid) grid.style.display = 'flex';

    const currentUserId = localStorage.getItem('user_id');

    const htmlPosts = posts.map(post => {
        let estiloBackground = '';
        if (post.image && post.image.trim() !== '') {
            const urlImagem = post.image.startsWith('data:') 
                ? post.image 
                : `data:image/jpeg;base64,${post.image}`;
                
            estiloBackground = `style="background-image: linear-gradient(rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.85)), url('${urlImagem}'); background-size: cover; background-position: center;"`;
        }

        // Condicional para exibir o botão Editar apenas se o post pertencer ao usuário logado
        // Certifique-se que sua API retorna a propriedade "user_id" no objeto post para a comparação funcionar corretamente.
        const ehDonoDoPost = currentUserId && (String(post.user_id) === String(currentUserId));
        
        const botaoEditar = ehDonoDoPost ? `
            <button class="btn btn-sm btn-outline-secondary" 
                    onclick="abrirPostModal(${post.id}, ${post.blog_id}, '${formataTextoModal(post.titulo)}', '${formataTextoModal(post.conteudo)}')">
                Editar
            </button>
        ` : '';

        const tituloTamanhoMaximo = 35;
        const tituloCapitalizado = post.titulo.charAt(0).toUpperCase() + post.titulo.slice(1).toLowerCase();
        const tituloFormatado = (tituloCapitalizado.length > tituloTamanhoMaximo) 
            ? (tituloCapitalizado.substring(0, tituloTamanhoMaximo) + "...") 
            : tituloCapitalizado;

        return `
            <div class="col-md-4 mb-4">
                <div class="card h-100" ${estiloBackground}>
                    <div class="card-body d-flex flex-column justify-content-between">
                        <div>
                            <h5 class="card-title fw-bold">${formataTextoModal(tituloFormatado)}</h5>
                            <p class="card-text text-muted small">ID: #${post.id}</p>
                        </div>
                        <div class="d-flex gap-2 mt-3">
                            <a href="javascript:void(0)" class="btn btn-sm btn-custom-site" onclick="irParaPost(${post.id})">Ver</a>
                            ${botaoEditar}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    grid.insertAdjacentHTML('beforeend', htmlPosts);
}

/***************************************************************************************/

function abrirPostModal(id, blogId, titulo, conteudo) {
    document.getElementById('postModalLabel').innerText = "Editar post";
    document.getElementById('post-id').value = id;
    document.getElementById('blog-id').value = blogId;
    document.getElementById('post-titulo').value = titulo;
    document.getElementById('post-conteudo').value = conteudo;
    document.getElementById('post-imagem-file').value = "";
    document.getElementById('post-feedback').style.display = 'none';

    const modalElement = document.getElementById('postModal');
    const modalInstance = new bootstrap.Modal(modalElement);
    modalInstance.show();
}

/***************************************************************************************/

function renderPostsVazio() {
    const grid = document.getElementById('posts-grid');
    const msgVazio = document.getElementById('posts-vazio');
    
    if (grid) grid.style.display = 'none';
    if (msgVazio) msgVazio.style.display = 'flex';
}

/***************************************************************************************/

function alternarModoVisualizacaoPosts(pressionouBotao = true) {
    if (!localStorage.getItem('token')) return;

    // Inverte o estado atual
    exibirTodosOsPosts = !exibirTodosOsPosts;

    // Reseta paginação para recarregar a nova lista
    postCurrentPage = 1;
    postHasMore = true;
    postLoading = false;

    const grid = document.getElementById('posts-grid');
    if (grid) grid.innerHTML = '';

    const msgFim = document.getElementById('posts-fim');
    if (msgFim) {
        msgFim.style.display = 'none';
        msgFim.innerHTML = '';
    }

    configurarInterfacePosts();
    carregarMaisPosts();
}

/***************************************************************************************/

async function executarCriacaoEdicaoPost() {
    const form = document.getElementById('post-form');
    const botaoSubmit = document.querySelector('#post-form button[type="submit"]');
    const botaoSubmitTextoOriginal = (botaoSubmit ? botaoSubmit.innerHTML : "");

    const postId = document.getElementById('post-id').value;
    const blogId = document.getElementById('blog-id').value;
    const titulo = document.getElementById('post-titulo').value;
    const conteudo = document.getElementById('post-conteudo').value;
    const inputImagem = document.getElementById('post-imagem-file');

    // Validação básica de campos vazios
    if (!titulo) {
        exibirFeedback('post-feedback', "Por favor, preencha todos os campos obrigatórios.", "alert-warning");
        return;
    }

    // Desabilita o formulário e muda o texto do botão
    desativarFormulario(form);
    if (botaoSubmit) {
        botaoSubmit.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Salvando...`;
    }

    const modoEdicao = (postId !== "");
    exibirFeedback('post-feedback', "Salvando...", "alert-info");

    try {
        let imagemBase64 = '';

        // Verifica se o usuário selecionou algum arquivo
        if (inputImagem && inputImagem.files && inputImagem.files[0]) {
            try {
                // Aguarda a conversão do arquivo para Base64
                imagemBase64 = await converterArquivoParaBase64(inputImagem.files[0]);
            } catch (erroConversao) {
                exibirFeedback('post-feedback', "Erro ao processar o arquivo de imagem.", "alert-danger");
                restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
                reativarFormulario(form);
                return;
            }
        }

        let response;

        // Passa a string Base64 obtida para a função original da API
        if (modoEdicao) {
            response = await updatePost(postId, blogId, titulo, conteudo, imagemBase64 || undefined);
        } else {
            response = await createPost(blogId, titulo, conteudo, imagemBase64 || undefined);
        }

        if ((response.status === 200) || (response.status === 201) || response.ok) {
            exibirFeedback('post-feedback', ("Cadastro " + (modoEdicao ? "atualizado" : "criado") + " com sucesso!"), "alert-success");

            setTimeout(() => {
                // Fecha o modal
                const modalElement = document.getElementById('postModal');
                const modalInstance = bootstrap.Modal.getInstance(modalElement);
                if (modalInstance) modalInstance.hide();

                // Reseta o formulário
                const form = document.getElementById('post-form');
                if (form) form.reset();
                document.getElementById('post-feedback').style.display = 'none';

                restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
                reativarFormulario(form);

                // Recarrega a seção de posts limpando a paginação para exibir o novo item
                navigateTo('posts');
            }, 1000);
        } else if (response.status === 401) {
            executarLogout();
        }  else if (response.status === 400) {
            const errorData = await response.json();
            const mensagemErro = errorData.mensagem || errorData.error || errorData.message || "Erro de validação nos dados enviados.";

            exibirFeedback('post-feedback', mensagemErro, "alert-danger");
            restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
            reativarFormulario(form);
        } else {
            exibirFeedback('post-feedback', "Erro ao realizar o cadastro. Verifique as informações.", "alert-danger");
            restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
            reativarFormulario(form);
        }
    } catch (error) {
        exibirFeedback('post-feedback', "Falha ao se conectar com o servidor.", "alert-danger");
        restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
        reativarFormulario(form);
    }
}

/***************************************************************************************/
/* UTILITÁRIOS PUROS                                                                   */
/***************************************************************************************/

// Função debounce para limitar a frequência de execução de uma função
function debounce(funcao, aguardarMs) {
    let temporizador;
    return function (...args) {
        clearTimeout(temporizador);
        temporizador = setTimeout(() => {
            funcao.apply(this, args);
        }, aguardarMs);
    };
}

/***************************************************************************************/

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

function removeQuebraLinha(str) {
    return str.replace(/(\r\n|\n|\r)/gm, "\\n");
}

function formataTextoModal(str) {
    return removeQuebraLinha(escapeHTML(str));
}

/***************************************************************************************/

function restaurarBotao(botao, textoOriginal) {
    if (botao) {
        botao.disabled = false;
        botao.innerHTML = textoOriginal;
    }
}

/***************************************************************************************/

function desativarFormulario(formElement) {
    if (!formElement) return;
    
    const elementos = formElement.querySelectorAll('input, select, textarea, button');
    elementos.forEach(elemento => {
        elemento.disabled = true;
    });
}

/***************************************************************************************/

function reativarFormulario(formElement) {
    if (!formElement) return;
    
    const elementos = formElement.querySelectorAll('input, select, textarea, button');
    elementos.forEach(elemento => {
        elemento.disabled = false;
    });
}

/***************************************************************************************/

function formatarCpfCnpj(value) {
    value = value.replace(/\D/g, "");

    if (value.length <= 11) {
        return value
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    } else {
        return value
            .replace(/^(\d{2})(\d)/, "$1.$2")
            .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
            .replace(/\.(\d{3})(\d)/, ".$1/$2")
            .replace(/(\d{4})(\d)/, "$1-$2");
    }
}

/***************************************************************************************/

function converterArquivoParaBase64(arquivo) {
    return new Promise((resolve, reject) => {
        const leitor = new FileReader();
        leitor.readAsDataURL(arquivo);
        leitor.onload = () => resolve(leitor.result);
        leitor.onerror = (erro) => reject(erro);
    });
}

/***************************************************************************************/

// Ouvinte de evento de rolagem (Scroll) da janela do navegador
window.addEventListener('scroll', () => {
    // Só monitora a rolagem se a seção ativa na tela atual for a de "blogs"
    const meusBlogsSection = document.getElementById('blogs');
    if (!meusBlogsSection || (meusBlogsSection.style.display === 'none')) return;

    if (blogLoading || !blogHasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;

    // Se o usuário chegar a 150px ou menos do fim da página, carrega mais dados
    if ((scrollTop + clientHeight) >= (scrollHeight - 150)) {
        carregarMaisBlogs();
    }
});