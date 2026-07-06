/***************************************************************************************/
/* GERENCIAMENTO DE ESTADO GLOBAL                                                                   */
/***************************************************************************************/

const AppState = {
    // Autenticação
    access_token: localStorage.getItem('access_token'),
    access_expires_in: localStorage.getItem('access_expires_in'),
    refresh_token: localStorage.getItem('refresh_token'),
    refresh_expires_in: localStorage.getItem('refresh_expires_in'),
    userId: localStorage.getItem('user_id'),
    
    // Contexto atual
    currentBlogId: null,
    currentBlog: null,
    
    // Paginação (comum para blogs e posts)
    currentPage: 1,
    perPage: 6,
    isLoading: false,
    hasMore: true,

    // Modo de visualização
    exibirTodos: false,

    resetPagination() {
        this.currentPage = 1;
        this.hasMore = true;
        this.isLoading = false;
    },

    startLoading(message = "Carregando...") {
        this.isLoading = true;
        const overlay = document.getElementById('global-loading');
        if (overlay) {
            overlay.querySelector('p').textContent = message;
            overlay.classList.remove('d-none');
        }
        toggleGlobalUI(false);
    },

    stopLoading() {
        this.isLoading = false;
        document.getElementById('global-loading')?.classList.add('d-none');
        toggleGlobalUI(true);
    }
};

// Atualiza access_token quando logar
function updateAuthState(access_token, access_expires_in, refresh_token, refresh_expires_in, userId) {
    AppState.access_token = access_token;
    AppState.access_expires_in = access_expires_in;
    AppState.refresh_token = refresh_token;
    AppState.refresh_expires_in = refresh_expires_in;
    AppState.userId = userId;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('access_expires_in', access_expires_in);
    localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('refresh_expires_in', refresh_expires_in);
    if (userId) localStorage.setItem('user_id', userId);
}

// Ler parâmetros da URL
function getUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        page: urlParams.get('page') || 'home',
        blogId: urlParams.get('blogId'),
        postId: urlParams.get('postId')
    };
}

/***************************************************************************************/
/* INICIALIZAÇÃO DA SPA                                                                */
/***************************************************************************************/

document.addEventListener('DOMContentLoaded', async () => {
    // Verifica se já está logado
    if (AppState.access_token) {
        atualizarNavbarLogado();
    }

    /***********************************************************************************/

    // Recupera estado ao recarregar a página
    const urlParams = getUrlParams();

    if (urlParams.page === 'posts') {
        if (urlParams.blogId) {
            AppState.currentBlogId = urlParams.blogId;
        }
    } else if (urlParams.page === 'post') {
        if (urlParams.postId) {
            irParaPost(urlParams.postId);
            return;
        }
    }

    /***********************************************************************************/

    // Verifica qual página carregar logo na primeira abertura do site
    const paginaInicial = (urlParams.page || 'home');
    
    // Substitui o estado inicial vazio pelo estado da página atual
    history.replaceState({ page: paginaInicial }, "", window.location.search || `?page=home`);
    navigateTo(paginaInicial, true);

    /***********************************************************************************/

    // Escuta o botão Voltar/Avançar do próprio navegador
    window.addEventListener('popstate', (e) => {
        // Se houver um estado salvo no histórico, navega para ele
        if (e.state && e.state.page) {
            navigateTo(e.state.page, true); // O 'true' aqui ativa o isPopState
        } else {
            navigateTo('home', true);   // Caso contrário, volta para a home por padrão
        }
    });

    /***********************************************************************************/
    
    // Carrega e renderiza as ultimas postagens na tela inicial
    const latestPosts = await fetchPosts('', '', 1, 6); 
    renderPostsListaUltimos(latestPosts);

    /***********************************************************************************/

    // Configura o campo de busca para pesquisar postagens na tela inicial
    const searchInput = document.getElementById('search-input');
    let termoBuscaAtual = '';
    if (searchInput) {
        const buscarPostsComDebounce = debounce(async (termo) => {
            termoBuscaAtual = termo.trim();
            
            // Resetar paginação para nova busca
            AppState.currentPage = 1;
            AppState.hasMore = true;

            const grid = document.getElementById('posts-ultimos-grid');
            if (grid) grid.innerHTML = '';

            await carregarMaisPostsBusca(termoBuscaAtual);
        }, 400);

        searchInput.addEventListener('input', (e) => {
            buscarPostsComDebounce(e.target.value);
        });
    }

    /***********************************************************************************/

    // Configura o formulário de login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); 
            await executarLogin();
        });
    }

    /***********************************************************************************/

    // Configura o formulário de cadastro
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault(); 
            await executarCadastro();
        });
    }

    /***********************************************************************************/
    
    // Configura o formulário de atualizar perfil
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await executarAtualizacaoPerfil();
        });
    }

    /***********************************************************************************/
    
    // Configura o formulário de criar blog
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
    
    // Configura o formulário de criar postagem
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
            document.getElementById('postModalLabel').innerText = "Criar nova postagem";
            if (AppState.currentBlogId) {
                document.getElementById('blog-id').value = AppState.currentBlogId;
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

    AppState.exibirTodos = false;
}

/***************************************************************************************/

// Função de navegação para alternar entre seções da SPA
function navigateTo(viewId, isPopState = false) {
    const sections = ['home', 'meu-cadastro', 'blogs', 'posts', 'post'];
    sections.forEach(id => {
        const section = document.getElementById(id);
        if (section) section.style.display = 'none';
    });

    const targetSection = document.getElementById(viewId);
    if (targetSection) {
        targetSection.style.display = 'block';
    }

    /***********************************************************************************/
    
    // Proteção de rotas autenticadas
    if (viewId === 'meu-cadastro') {
        if (!localStorage.getItem('access_token')) {
            navigateTo('home');
            return;
        }
    }

    /***********************************************************************************/

    if (viewId === 'meu-cadastro') {
        carregarDadosPerfil();
    }

    /***********************************************************************************/

    if (viewId === 'blogs') {
        AppState.resetPagination();
        AppState.exibirTodos = !localStorage.getItem('access_token');

        configurarInterfaceBlogs();
        carregarMaisBlogs();
    }

    /***********************************************************************************/

    if (viewId === 'posts') {
        AppState.resetPagination();

        const urlParams = getUrlParams();
        AppState.currentBlogId = urlParams.blogId;

        if (AppState.currentBlogId && !AppState.currentBlog) {
            fetchBlogById(AppState.currentBlogId).then(blog => {
                if (blog) AppState.currentBlog = blog;
                configurarInterfacePosts();
                carregarMaisPosts();
            }).catch(() => {
                configurarInterfacePosts();
                carregarMaisPosts();
            });
        } else {
            configurarInterfacePosts();
            carregarMaisPosts();
        }
    }

    /***********************************************************************************/

    if (viewId === 'post') {
        atualizarBotaoVoltarPost();
    }

    /***********************************************************************************/

    // Se a navegação NÃO veio do popstate (botão voltar/avançar), salva no histórico
    if (!isPopState) {
        let newUrl = `?page=${viewId}`;
        if (viewId === 'posts' && AppState.currentBlogId) {
            newUrl += `&blogId=${AppState.currentBlogId}`;
        }
        history.pushState({ page: viewId, blogId: AppState.currentBlogId }, "", newUrl);
    }
}

/***************************************************************************************/
/* FLUXOS DE AUTENTICAÇÃO                                                              */
/***************************************************************************************/

async function executarLogin() {
    AppState.startLoading('Autenticando...');

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
                resetarModalFormulario('loginModal', 'login-form');
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
    } finally {
        AppState.stopLoading();
    }
}

/***************************************************************************************/

async function executarCadastro() {
    AppState.startLoading("Cadastrando...");

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
                resetarModalFormulario('registerModal', 'register-form');
                restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
                reativarFormulario(form);
                
                // Abre o modal de login para facilitar o fluxo do usuário
                const loginModalElement = document.getElementById('loginModal');
                const loginModal = new bootstrap.Modal(loginModalElement);
                loginModal.show();
            }, 1000);
        } else {
            const mensagemErro = await handleApiError(response, "Erro ao realizar o cadastro.");
            exibirFeedback('register-feedback', mensagemErro, "alert-danger");
            restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
            reativarFormulario(form);
        }
    } catch (error) {
        exibirFeedback('register-feedback', "Falha ao se conectar com o servidor.", "alert-danger");
        restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
        reativarFormulario(form);
    } finally {
        AppState.stopLoading();
    }
}

/***************************************************************************************/
/* FLUXOS DE PERFIL                                                                    */
/***************************************************************************************/

async function carregarDadosPerfil() {
    AppState.startLoading("Carregando dados do perfil...");

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
    } finally {
        AppState.stopLoading();
    }
}

/***************************************************************************************/

async function executarAtualizacaoPerfil() {
    AppState.startLoading("Atualizando cadastro...");

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

            setTimeout(() => {
                restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
                reativarFormulario(form);
            }, 1200);
        } else {
            const mensagemErro = await handleApiError(response, "Erro ao atualizar o perfil.");
            exibirFeedback('profile-feedback', mensagemErro, "alert-danger");
            restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
            reativarFormulario(form);
        }
    } catch (error) {
        exibirFeedback('profile-feedback', "Falha ao se conectar com o servidor.", "alert-danger");
        restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
        reativarFormulario(form);
    } finally {
        AppState.stopLoading();
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
    localStorage.removeItem('access_token');
    localStorage.removeItem('access_expires_in');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('refresh_expires_in');
    localStorage.removeItem('user_id');

    // Atualiza a página
    window.location.reload();
}

/***************************************************************************************/
/* FLUXOS DE BLOGS                                                                     */
/***************************************************************************************/

async function carregarMaisBlogs() {
    if (AppState.isLoading || !AppState.hasMore) return;

    AppState.isLoading = true;
    AppState.startLoading("Carregando blogs...");

    const grid = document.getElementById('blogs-grid');
    const msgFim = document.getElementById('blogs-fim');

    if (AppState.currentPage === 1 && grid) {
        grid.innerHTML = '';
    }

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
        const loggedUserId = (AppState.exibirTodos ? '' : (localStorage.getItem('user_id') || ''));
        const blogs = await fetchBlogs(loggedUserId, AppState.currentBlogId, '', AppState.currentPage, AppState.perPage);
        
        const spinner = document.getElementById(spinnerId);
        if (spinner) spinner.remove();

        if (!blogs || !Array.isArray(blogs) || (blogs.length === 0)) {
            AppState.hasMore = false;

            if (AppState.currentPage === 1) {
                renderBlogsVazio();
            } else if (msgFim) {
                msgFim.innerHTML = msgFimTexto;
                msgFim.style.display = 'block';
            }
            return; // Interrompe o fluxo aqui para não executar o assistente abaixo
        }

        renderBlogsLista(blogs);

        if (blogs.length < AppState.perPage) {
            AppState.hasMore = false;

            if (msgFim) {
                msgFim.innerHTML = msgFimTexto;
                msgFim.style.display = 'block';
            }
        }

        AppState.currentPage++; 

        setTimeout(() => {
            if (AppState.hasMore && !AppState.isLoading && document.documentElement.scrollHeight <= window.innerHeight) {
                carregarMaisBlogs();
            }
        }, 300);
    } catch (error) {
        const spinner = document.getElementById(spinnerId);
        if (spinner) spinner.remove();
        console.error("Erro ao processar scroll de blogs:", error);

        if (AppState.currentPage > 1) {
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
        AppState.stopLoading();

        if (!AppState.hasMore) {
            AppState.isLoading = true; // Mantém "travado" para recusar novos scrolls fantasmas
        } else {
            AppState.isLoading = false;
        }
    }
}

/***************************************************************************************/

async function executarCriacaoEdicaoBlog() {
    AppState.startLoading("Salvando blog...");

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

        if (modoEdicao) {
            response = await updateBlog(blogId, nome, imagemBase64 || undefined);
        } else {
            response = await createBlog(nome, imagemBase64 || undefined);
        }

        if (response.ok || (response.status === 200) || (response.status === 201)) {
            exibirFeedback('blog-feedback',
                ("Blog " + (modoEdicao ? "atualizado" : "criado") + " com sucesso!"),
                "alert-success"
            );

            setTimeout(() => {
                resetarModalFormulario('blogModal', 'blog-form');
                restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
                reativarFormulario(form);
                navigateTo('blogs');
            }, 1000);
        } else {
            const mensagemErro = await handleApiError(response, "Erro ao salvar blog.");
            exibirFeedback('blog-feedback', mensagemErro, "alert-danger");
            restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
            reativarFormulario(form);
        }
    } catch (error) {
        exibirFeedback('blog-feedback', "Falha ao se conectar com o servidor.", "alert-danger");
        restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
        reativarFormulario(form);
    } finally {
        AppState.stopLoading();
    }
}

/***************************************************************************************/

async function confirmarExclusaoBlog(id, nome) {
    if (!AppState.access_token) return;

    if (!confirm(`Tem certeza que deseja excluir o blog "${nome}"?\n\nEsta ação não pode ser desfeita.`)) {
        return;
    }

    AppState.startLoading("Excluindo blog...");

    try {
        const response = await deleteBlog(id);
        
        if (response.ok || response.status === 204) {
            alert("Blog excluído com sucesso!");

            // Recarrega a lista atual
            const grid = document.getElementById('blogs-grid');
            if (grid) grid.innerHTML = '';
            AppState.currentPage = 1;
            AppState.hasMore = true;
            carregarMaisBlogs();
        } else {
            const mensagemErro = await handleApiError(response, "Erro ao excluir blog.");
            alert(mensagemErro);
        }
    } catch (error) {
        console.error("Erro ao excluir blog:", error);
        alert("Falha ao se conectar com o servidor.");
    } finally {
        AppState.stopLoading();
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

    const htmlBlogs = blogs.map(blog => renderCard(blog, 'blog')).join('');
    grid.insertAdjacentHTML('beforeend', htmlBlogs);
}

/***************************************************************************************/

function renderBlogsVazio() {
    const grid = document.getElementById('blogs-grid');
    const msgVazio = document.getElementById('blogs-vazio');
    
    if (grid) grid.style.display = 'none';
    if (msgVazio) msgVazio.style.display = 'flex';
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

function alternarModoVisualizacaoBlogs(pressionouBotao = true) {
    if (!localStorage.getItem('access_token')) return;

    // Inverte o estado atual
    AppState.exibirTodos = !AppState.exibirTodos;

    // Reseta paginação para recarregar a nova lista
    AppState.currentPage = 1;
    AppState.hasMore = true;
    AppState.isLoading = false;

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

function configurarInterfaceBlogs() {
    const access_token = localStorage.getItem('access_token');
    const btnCriar = document.getElementById('btn-criar-novo-blog');
    const btnVerTodos = document.getElementById('btn-ver-todos-blogs');
    const tituloPagina = document.getElementById('blogs-page-title');
    const subTituloPagina = document.getElementById('blogs-page-subtitle');
    const vazioTitulo = document.getElementById('blogs-vazio-titulo');
    const vazioSubtitulo = document.getElementById('blogs-vazio-subtitulo');

    if (!access_token) {
        // Usuário deslogado vendo blogs globais
        if (btnCriar) btnCriar.classList.add('d-none');
        if (btnVerTodos) btnVerTodos.classList.add('d-none');
        if (tituloPagina) tituloPagina.innerText = "Blogs";
        if (subTituloPagina) subTituloPagina.innerText = "Explore publicações e conteúdos de nossos autores";
        if (vazioTitulo) vazioTitulo.innerText = "Nenhum blog encontrado";
        if (vazioSubtitulo) vazioSubtitulo.innerText = "Não há blogs registrados na plataforma atualmente.";
    } else {
        // Usuário logado
        if (AppState.exibirTodos) {
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

async function irParaPostsDoBlog(blogId) {
    AppState.startLoading("Carregando postagens do blog...");

    try {
        AppState.currentBlogId = blogId;
        
        // Aguarda o blog ser carregado
        const blog = await fetchBlogById(blogId);
        if (blog) {
            AppState.currentBlog = blog;
        } else {
            AppState.currentBlog = { id: blogId, nome: `Blog #${blogId}` };
        }

        // Reseta paginação
        AppState.resetPagination();

        // Atualiza URL e navega
        history.pushState(
            { page: 'posts', blogId: blogId }, 
            "", 
            `?page=posts&blogId=${blogId}`
        );

        navigateTo('posts', true);   // true = veio do popstate
    } catch (error) {
        console.error("Erro ao carregar postagens do blog:", error);
        alert("Não foi possível carregar as postagens deste blog.");
    } finally {
        AppState.stopLoading();
    }
}

/***************************************************************************************/

function voltarParaBlogs() {
    AppState.currentBlogId = null;
    AppState.currentBlog = null;

    history.pushState({ page: 'blogs' }, "", "?page=blogs");
    navigateTo('blogs');
}

/***************************************************************************************/
/* FLUXOS DE POST                                                                      */
/***************************************************************************************/

async function carregarMaisPosts() {
    if (AppState.isLoading || !AppState.hasMore) return;

    AppState.isLoading = true;
    AppState.startLoading("Carregando mais postagens...");

    const grid = document.getElementById('posts-grid');
    
    const spinnerId = 'post-scroll-spinner';
    if (grid && !document.getElementById(spinnerId)) {
        grid.insertAdjacentHTML('beforeend', `<div id="${spinnerId}" class="col-12 text-center my-3"><div class="spinner-border text-primary"></div></div>`);
    }

    try {
        const posts = await fetchPosts(
            AppState.currentBlogId || '', 
            '', 
            AppState.currentPage, 
            AppState.perPage
        );

        document.getElementById(spinnerId)?.remove();

        if (!posts || posts.length === 0) {
            AppState.hasMore = false;
            renderPostsLista([]);
            return;
        }

        renderPostsLista(posts); 
        
        if (posts.length < AppState.perPage) {
            AppState.hasMore = false;
        }
        
        AppState.currentPage++;
    } catch (error) {
        document.getElementById(spinnerId)?.remove();
        console.error("Erro ao carregar postagens:", error);
    } finally {
        AppState.stopLoading();
        AppState.isLoading = false;
    }
}

/***************************************************************************************/

async function irParaPost(postId) {
    AppState.startLoading("Carregando postagem...");

    try {
        const post = await fetchPostById(postId);

        if (!post) {
            alert("Postagem não encontrada");
            navigateTo('posts');
            return;
        }

        if (post.blog_id) {
            AppState.currentBlogId = post.blog_id;
            if (!AppState.currentBlog) {
                AppState.currentBlog = await fetchBlogById(post.blog_id);
            }
        }

        history.pushState(
            { page: 'post', postId: postId },
            "",
            `?page=post&postId=${postId}`
        );

        document.getElementById('post-titulo-full').textContent = formataTextoModal(post.titulo);
        
        const conteudoEl = document.getElementById('post-conteudo-full');
        conteudoEl.innerHTML = formataTextoModal(post.conteudo || '').replace(/\n/g, '<br>');

        const imgContainer = document.getElementById('post-imagem-destaque');
        if (post.image || post.imagem) {
            const url = (post.image || post.imagem).startsWith('data:') 
                ? (post.image || post.imagem) 
                : `data:image/jpeg;base64,${post.image || post.imagem}`;
            imgContainer.style.backgroundImage = `url('${url}')`;
            imgContainer.style.display = 'block';
        } else {
            imgContainer.style.display = 'none';
        }

        document.getElementById('post-meta').innerHTML = `
            Postagem ID #${post.id} • ${new Date(post.data_cadastro || Date.now()).toLocaleDateString('pt-BR')}
        `;

        await carregarComentarios(postId);
        configurarFormularioComentario(postId);

        atualizarBotaoVoltarPost();
        navigateTo('post', true);  // 'true' para não sobrescrever a URL novamente

    } catch (error) {
        console.error("Erro ao carregar postagem:", error);
        alert("Não foi possível carregar a postagem.");
        navigateTo('posts');
    } finally {
        AppState.stopLoading();
    }
}

/***************************************************************************************/

async function carregarMaisPostsBusca(termo = '') {
    if (AppState.isLoading || !AppState.hasMore) return;

    AppState.isLoading = true;
    const grid = document.getElementById('posts-ultimos-grid');

    const spinnerId = 'home-search-spinner';
    if (grid && !document.getElementById(spinnerId)) {
        grid.insertAdjacentHTML('beforeend', `<div id="${spinnerId}" class="col-12 text-center my-3"><div class="spinner-border text-primary"></div></div>`);
    }

    try {
        const posts = await fetchPosts('', termo, AppState.currentPage, AppState.perPage);

        document.getElementById(spinnerId)?.remove();

        if (!posts || posts.length === 0) {
            AppState.hasMore = false;
            if (AppState.currentPage === 1 && grid) {
                grid.innerHTML = `
                    <div class="col-12 text-center py-5">
                        <p class="text-muted">Nenhuma postagem encontrada para "${termo}"</p>
                    </div>
                `;
            }
            return;
        }

        // Usa o mesmo card dos blogs
        const html = posts.map(post => renderCard(post, 'post')).join('');
        grid.insertAdjacentHTML('beforeend', html);

        if (posts.length < AppState.perPage) {
            AppState.hasMore = false;
        }

        AppState.currentPage++;
    } catch (error) {
        console.error("Erro na busca:", error);
    } finally {
        AppState.isLoading = false;
    }
}

/***************************************************************************************/

async function executarCriacaoEdicaoPost() {
    AppState.startLoading("Salvando postagem...");

    const form = document.getElementById('post-form');
    const botaoSubmit = document.querySelector('#post-form button[type="submit"]');
    const botaoSubmitTextoOriginal = (botaoSubmit ? botaoSubmit.innerHTML : "");

    const postId = document.getElementById('post-id').value;
    const blogId = (AppState.currentBlogId || document.getElementById('blog-id').value);
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

        if (modoEdicao) {
            response = await updatePost(postId, blogId, titulo, conteudo, imagemBase64 || undefined);
        } else {
            response = await createPost(blogId, titulo, conteudo, imagemBase64 || undefined);
        }

        if (response.ok || (response.status === 200) || (response.status === 201)) {
            exibirFeedback('post-feedback',
                ("Cadastro " + (modoEdicao ? "atualizado" : "criado") + " com sucesso!"),
                "alert-success"
            );

            setTimeout(() => {
                resetarModalFormulario('postModal', 'post-form');
                restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
                reativarFormulario(form);
                navigateTo('posts');
            }, 1000);
        } else {
            const mensagemErro = await handleApiError(response, "Erro ao salvar postagem.");
            exibirFeedback('post-feedback', mensagemErro, "alert-danger");
            restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
            reativarFormulario(form);
        }
    } catch (error) {
        exibirFeedback('post-feedback', "Falha ao se conectar com o servidor.", "alert-danger");
        restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
        reativarFormulario(form);
    } finally {
        AppState.stopLoading();
    }
}

/***************************************************************************************/

async function confirmarExclusaoPost(id, titulo) {
    if (!AppState.access_token) return;

    if (!confirm(`Tem certeza que deseja excluir a postagem "${titulo}"?\n\nEsta ação não pode ser desfeita.`)) {
        return;
    }

    AppState.startLoading("Excluindo postagem...");

    try {
        const response = await deletePost(id);
        
        if (response.ok || response.status === 204) {
            alert("Postagem excluída com sucesso!");

            // Recarrega a lista atual
            const grid = document.getElementById('posts-grid');
            if (grid) grid.innerHTML = '';
            AppState.currentPage = 1;
            AppState.hasMore = true;
            carregarMaisPosts();
        } else {
            const mensagemErro = await handleApiError(response, "Erro ao excluir postagem.");
            alert(mensagemErro);
        }
    } catch (error) {
        console.error("Erro ao excluir postagem:", error);
        alert("Falha ao se conectar com o servidor.");
    } finally {
        AppState.stopLoading();
    }
}

/***************************************************************************************/

function renderPostsLista(posts, append = false) {
    const grid = document.getElementById('posts-grid');
    const msgVazio = document.getElementById('posts-vazio');
    if (!grid) return;

    // Limpa o grid apenas na primeira carga
    if (!append) {
        grid.innerHTML = '';
    }

    if (!posts || posts.length === 0) {
        if (msgVazio) msgVazio.style.display = 'block';
        if (grid) grid.style.display = 'none';
        return;
    }

    if (msgVazio) msgVazio.style.display = 'none';
    if (grid) grid.style.display = 'flex';

    const htmlPosts = posts.map(post => renderCard(post, 'post')).join('');
    grid.insertAdjacentHTML('beforeend', htmlPosts);
}

/***************************************************************************************/

function renderPostsVazio() {
    const grid = document.getElementById('posts-grid');
    const msgVazio = document.getElementById('posts-vazio');
    
    if (grid) grid.style.display = 'none';
    if (msgVazio) msgVazio.style.display = 'flex';
}

/***************************************************************************************/

function renderPostsListaUltimos(posts) {
    const grid = document.getElementById('posts-ultimos-grid');
    if (!grid) return;
    
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
    
    grid.innerHTML = posts.map(post => renderCard(post, 'post')).join('');
}

/***************************************************************************************/

function abrirPostModal(id, blogId, titulo, conteudo) {
    document.getElementById('postModalLabel').innerText = "Editar postagem";
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

function alternarModoVisualizacaoPosts(pressionouBotao = true) {
    if (!localStorage.getItem('access_token')) return;

    // Inverte o estado atual
    AppState.exibirTodos = !AppState.exibirTodos;

    // Reseta paginação
    AppState.currentPage = 1;
    AppState.hasMore = true;
    AppState.isLoading = false;

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

function configurarInterfacePosts() {
    const header = document.getElementById('posts-header');
    const tituloPagina = document.getElementById('posts-page-title');
    const subTituloPagina = document.getElementById('posts-page-subtitle');
    const btnCriar = document.querySelector('#posts button[data-bs-target="#postModal"]');
    const btnVerTodos = document.getElementById('btn-ver-todos-posts');
    const btnVoltarBlogs = document.getElementById('btn-voltar-para-blogs');

    const userId = localStorage.getItem('user_id');
    const ehDonoDoBlog = AppState.currentBlog && 
                         AppState.currentBlog.user_id && 
                         String(AppState.currentBlog.user_id) === String(userId);

    if (AppState.currentBlog && AppState.currentBlog.nome) {
        // Texto
        if (tituloPagina) tituloPagina.textContent = AppState.currentBlog.nome;
        if (subTituloPagina) subTituloPagina.textContent = "Gerencie as publicações deste blog";

        // Fundo
        if (header && AppState.currentBlog.image) {
            const urlImagem = AppState.currentBlog.image.startsWith('data:') 
                ? AppState.currentBlog.image 
                : `data:image/jpeg;base64,${AppState.currentBlog.image}`;
            header.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url('${urlImagem}')`;
            header.style.color = 'white';
        } else {
            header.style.backgroundImage = '';
            header.style.color = '';
        }

        // Botões
        if (btnVerTodos) btnVerTodos.classList.add('d-none');
        if (btnVoltarBlogs) btnVoltarBlogs.classList.remove('d-none');
        if (btnCriar) {
            btnCriar.style.display = (AppState.access_token && ehDonoDoBlog) ? 'block' : 'none';
        }
    } else {
        // Texto
        if (tituloPagina) tituloPagina.textContent = "Postagens";
        if (subTituloPagina) subTituloPagina.textContent = "Explorando conteúdos";

        // Fundo
        if (header) {
            header.style.backgroundImage = '';
            header.style.color = '';
        }

        // Botões
        if (btnVerTodos && AppState.access_token) btnVerTodos.classList.remove('d-none');
        if (btnVoltarBlogs) btnVoltarBlogs.classList.add('d-none');
        if (btnCriar) {
            btnCriar.style.display = AppState.access_token ? 'block' : 'none';
        }
    }
}

/***************************************************************************************/

function atualizarBotaoVoltarPost() {
    const btn = document.getElementById('btn-voltar-post');
    if (!btn) return;

    if (AppState.currentBlogId && AppState.currentBlog && AppState.currentBlog.nome) {
        const nomeBlog = AppState.currentBlog.nome.length > 40 
            ? AppState.currentBlog.nome.substring(0, 37) + '...' 
            : AppState.currentBlog.nome;
        
        btn.innerHTML = `← Voltar ao blog <strong>"${nomeBlog}"</strong>`;
    } else {
        btn.innerHTML = '← Voltar para as postagens';
    }

    btn.onclick = () => {
        if (AppState.currentBlogId) {
            history.pushState(
                { page: 'posts', blogId: AppState.currentBlogId }, 
                "", 
                `?page=posts&blogId=${AppState.currentBlogId}`
            );
        }
        navigateTo('posts');
    };
}

/***************************************************************************************/
// FUNÇÃO GENÉRICA PARA RENDERIZAR CARDS (Blogs e Posts)
/***************************************************************************************/

function renderCard(item, tipo = 'post') {
    const currentUserId = localStorage.getItem('user_id');
    let html = '';

    if (tipo === 'blog') {
        const ehDono = currentUserId && String(item.user_id) === String(currentUserId);
        let estiloBackground = '';

        if (item.image) {
            const urlImagem = item.image.startsWith('data:') ? item.image : `data:image/jpeg;base64,${item.image}`;
            estiloBackground = `style="background-image: linear-gradient(rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.85)), url('${urlImagem}'); background-size: cover; background-position: center;"`;
        }

        html = `
            <div class="col-md-4 mb-4">
                <div class="card h-100" ${estiloBackground}>
                    <div class="card-body d-flex flex-column justify-content-between">
                        <div>
                            <h5 class="card-title fw-bold">${formataTextoModal(item.nome)}</h5>
                            <p class="card-text text-muted small">ID: #${item.id}</p>
                        </div>
                        <div class="d-flex gap-2 mt-3">
                            <a href="javascript:void(0)" class="btn btn-sm btn-custom-site" onclick="irParaPostsDoBlog(${item.id})">Ver Postagens</a>
                            ${ehDono ? `
                                <button class="btn btn-sm btn-outline-secondary" onclick="abrirBlogModal(${item.id}, '${formataTextoModal(item.nome)}')">Editar</button>
                                <button class="btn btn-sm btn-outline-danger" onclick="confirmarExclusaoBlog(${item.id}, '${formataTextoModal(item.nome)}')">Excluir</button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    } 
    else if (tipo === 'post') {
        const ehDono = currentUserId && String(item.user_id) === String(currentUserId);
        let estiloBackground = '';

        if (item.image) {
            const urlImagem = item.image.startsWith('data:') ? item.image : `data:image/jpeg;base64,${item.image}`;
            estiloBackground = `style="background-image: linear-gradient(rgba(255,255,255,0.85), rgba(255,255,255,0.85)), url('${urlImagem}');"`;
        }

        html = `
            <div class="col-md-4 mb-4">
                <div class="card h-100" ${estiloBackground}>
                    <div class="card-body d-flex flex-column justify-content-between">
                        <div>
                            <h5 class="card-title fw-bold">${formataTextoModal(item.titulo)}</h5>
                            <p class="card-text text-muted small">ID: #${item.id}</p>
                        </div>
                        <div class="d-flex gap-2 mt-3">
                            <a href="javascript:void(0)" class="btn btn-sm btn-custom-site" onclick="irParaPost(${item.id})">Ver postagem</a>
                            ${ehDono ? `
                                <button class="btn btn-sm btn-outline-secondary" onclick="abrirPostModal(${item.id}, ${item.blog_id}, '${formataTextoModal(item.titulo)}', '${formataTextoModal(item.conteudo)}')">Editar</button>
                                <button class="btn btn-sm btn-outline-danger" onclick="confirmarExclusaoPost(${item.id}, '${formataTextoModal(item.titulo)}')">Excluir</button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    return html;
}

/***************************************************************************************/
/* COMMENTS - FRONTEND                                                                 */
/***************************************************************************************/

async function carregarComentarios(postId) {
    const container = document.getElementById('comments-list');
    if (!container) return;

    container.innerHTML = '<div class="text-center"><div class="spinner-border spinner-border-sm"></div></div>';

    try {
        const comments = await fetchComments(postId);
        
        if (!comments || comments.length === 0) {
            container.innerHTML = `<p class="text-muted small">Nenhum comentário ainda. Seja o primeiro!</p>`;
            return;
        }

        container.innerHTML = comments.map(c => {
            const data = new Date(c.data_cadastro || Date.now());
            const dia = String(data.getDate()).padStart(2, '0');
            const mes = String(data.getMonth() + 1).padStart(2, '0');
            const ano = data.getFullYear();
            const hora = String(data.getHours()).padStart(2, '0');
            const minuto = String(data.getMinutes()).padStart(2, '0');
            const dataFormatada = `${dia}/${mes}/${ano} ${hora}:${minuto}`;

            // === APENAS O DONO DO BLOG pode excluir comentários ===
            const ehDonoDoBlog = AppState.access_token && 
                AppState.currentBlog && 
                String(AppState.currentBlog.user_id) === String(AppState.userId);

            return `
                <div class="d-flex mb-3 border-bottom pb-3">
                    <div class="flex-grow-1">
                        <strong>${formataTextoModal(c.nome || c.user_nome || 'Usuário')}</strong>
                        <small class="text-muted ms-2">${dataFormatada}</small>
                        <p class="mb-1 mt-1">${formataTextoModal(c.texto)}</p>
                    </div>
                    
                    ${ehDonoDoBlog ? `
                        <button onclick="confirmarExclusaoComentario(${c.id})" 
                                class="btn btn-sm btn-outline-danger ms-2" title="Excluir comentário">
                            🗑
                        </button>
                    ` : ''}
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error(e);
        container.innerHTML = `<p class="text-danger">Erro ao carregar comentários.</p>`;
    }
}

/***************************************************************************************/

async function configurarFormularioComentario(postId) {
    const container = document.getElementById('comment-form-container');
    if (container) {
        container.classList.toggle('d-none', !AppState.access_token);
    }

    const form = document.getElementById('comment-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            await executarCriacaoComentario(postId);
        };
    }
}

/***************************************************************************************/

async function executarCriacaoComentario(postId) {
    const texto = document.getElementById('comment-texto').value.trim();

    if (!texto) return;

    try {
        const response = await createComment(postId, texto);
        
        if (response.ok || response.status === 201) {
            document.getElementById('comment-texto').value = '';
            await carregarComentarios(postId);
        } else {
            alert("Erro ao publicar comentário.");
        }
    } catch (error) {
        console.error(error);
        alert("Falha ao enviar comentário.");
    }
}

/***************************************************************************************/

async function confirmarExclusaoComentario(id) {
    if (!confirm("Tem certeza que deseja excluir este comentário?")) return;

    try {
        const response = await deleteComment(id);
        if (response.ok || response.status === 204) {
            const urlParams = getUrlParams();
            const postId = urlParams.postId;

            if (postId) await carregarComentarios(postId);
        } else {
            alert("Erro ao excluir comentário.");
        }
    } catch (error) {
        console.error(error);
        alert("Falha ao excluir comentário.");
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

function removeQuebraLinha(str) {
    return str.replace(/(\r\n|\n|\r)/gm, "<br>");
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

function formataTextoModal(str) {
    if (!str) return '';
    return escapeHTML(removeQuebraLinha(str));
}

/***************************************************************************************/

async function handleApiError(response, defaultMessage = "Erro ao processar requisição.") {
    if (response.status === 401) {
        executarLogout();
        return "Sessão expirada. Faça login novamente.";
    }

    try {
        const errorData = await response.json();
        
        return errorData.mensagem || 
               errorData.message || 
               errorData.error || 
               errorData.detail ||
               defaultMessage;
    } catch (e) {
        if (response.status === 400) {
            return "Dados inválidos. Verifique as informações.";
        }
        return defaultMessage;
    }
}

/***************************************************************************************/

function resetarModalFormulario(modalId, formId) {
    const modalElement = document.getElementById(modalId);
    const form = document.getElementById(formId);
    
    // Fecha o modal
    if (modalElement) {
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) modalInstance.hide();
    }
    
    // Reseta o formulário
    if (form) form.reset();
    
    // Limpa feedbacks
    const feedbackId = formId.replace('-form', '-feedback');
    const feedback = document.getElementById(feedbackId);
    if (feedback) feedback.style.display = 'none';
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

function toggleGlobalUI(enabled) {
    const buttons = document.querySelectorAll('button, .btn');
    buttons.forEach(btn => {
        if (!btn.closest('.modal')) {  // Não desabilita botões dentro de modais abertos
            btn.disabled = !enabled;
        }
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
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    const threshold = scrollHeight - 150;
    
    // Home
    if (document.getElementById('home').style.display !== 'none') {
        if (!AppState.isLoading && AppState.hasMore && (scrollTop + clientHeight) >= threshold) {
            carregarMaisPostsBusca(termoBuscaAtual || '');
        }
    }

    // Blogs
    if (document.getElementById('blogs').style.display !== 'none') {
        if (!AppState.isLoading && AppState.hasMore && (scrollTop + clientHeight) >= threshold) {
            carregarMaisBlogs();
        }
    }

    // Posts
    if (document.getElementById('posts').style.display !== 'none') {
        if (!AppState.isLoading && AppState.hasMore && (scrollTop + clientHeight) >= threshold) {
            carregarMaisPosts();
        }
    }
});