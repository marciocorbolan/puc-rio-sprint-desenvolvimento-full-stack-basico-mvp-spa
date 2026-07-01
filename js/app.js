/***************************************************************************************/
/* INICIALIZAÇÃO DA SPA                                                                */
/***************************************************************************************/

document.addEventListener('DOMContentLoaded', async () => {
    // Verifica se já está logado
    if (localStorage.getItem('token')) {
        atualizarNavbarLogado();
    }

    /***********************************************************************************/
    
    // Carregar posts iniciais na Home
    const initialPosts = await fetchPosts();
    renderPosts(initialPosts);

    /***********************************************************************************/

    // Configurar o campo de busca para filtrar posts
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        const buscarPostsComDebounce = debounce(async (termo) => {
            const filteredPosts = await fetchPosts(termo);
            renderPosts(filteredPosts);
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
    const paginaInicial = params.get('page') || 'home';
    
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
    const sections = ['home', 'meu-cadastro', 'meus-blogs'];
    sections.forEach(id => {
        const section = document.getElementById(id);
        if (section) section.style.display = 'none';
    });

    const targetSection = document.getElementById(viewId);
    if (targetSection) {
        targetSection.style.display = 'block';
    }

    if (viewId === 'meu-cadastro') {
        if (!localStorage.getItem('token')) {
            navigateTo('home');
            return;
        } else {
            carregarDadosPerfil();
        }
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
    const botaoSubmit = document.querySelector('#login-form button[type="submit"]');
    const botaoSubmitTextoOriginal = botaoSubmit ? botaoSubmit.innerHTML : "";
    
    const cpfcnpj = document.getElementById('login-cpfcnpj').value;
    const senha = document.getElementById('login-senha').value;

    // Remove a formatação (máscara) antes de enviar para o servidor
    const cpfcnpjLimpo = cpfcnpj.replace(/\D/g, "");

    // Validação básica de campos vazios
    if (!cpfcnpjLimpo || !senha) {
        exibirFeedback('login-feedback', "Por favor, preencha todos os campos.", "alert-warning");
        return;
    }

    // Validação de tamanho (mínimo 11, máximo 14)
    if (cpfcnpjLimpo.length < 11 || cpfcnpjLimpo.length > 14) {
        exibirFeedback('login-feedback', "O CPF/CNPJ deve ter entre 11 e 14 dígitos.", "alert-warning");
        return;
    }

    // Desabilita o botão e muda o texto para indicar processamento
    if (botaoSubmit) {
        botaoSubmit.disabled = true;
        botaoSubmit.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Entrando...`;
    }

    exibirFeedback('login-feedback', "Autenticando...", "alert-info");

    try {
        const response = await login(cpfcnpjLimpo, senha);

        if (response.ok) {
            exibirFeedback('login-feedback', "Login efetuado com sucesso!", "alert-success");
            atualizarNavbarLogado();
            
            // Fecha o modal automaticamente após 1 segundo
            setTimeout(() => {
                const modalElement = document.getElementById('loginModal');
                const modalInstance = bootstrap.Modal.getInstance(modalElement);
                if (modalInstance) modalInstance.hide();

                // Limpa o formulário e feedback
                const form = document.getElementById('login-form');
                if (form) form.reset();
                document.getElementById('login-feedback').style.display = 'none';
            }, 1000);
        } else {
            // Se a resposta NÃO for ok, tenta extrair a mensagem real vinda do backend
            let mensagemErro = "Erro ao tentar fazer login. Tente novamente mais tarde.";
            
            try {
                const errorData = await response.json();
                mensagemErro = errorData.mensagem || errorData.error || errorData.message || mensagemErro;
            } catch (e) {
                // Caso o backend não retorne um JSON válido no erro, decide por status HTTP genéricos
                if (response.status === 401 || response.status === 403) {
                    mensagemErro = "CPF/CNPJ ou senha incorretos.";
                }
            }

            exibirFeedback('login-feedback', mensagemErro, "alert-danger");
        }
    } catch (error) {
        exibirFeedback('login-feedback', "Falha ao se conectar com o servidor.", "alert-danger");
    } finally {
        restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
    }
}

/***************************************************************************************/

async function executarCadastro() {
    const botaoSubmit = document.querySelector('#register-form button[type="submit"]');
    const botaoSubmitTextoOriginal = botaoSubmit ? botaoSubmit.innerHTML : "";

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

    // Validação de tamanho (mínimo 11, máximo 14)
    if (cpfcnpjLimpo.length < 11 || cpfcnpjLimpo.length > 14) {
        exibirFeedback('register-feedback', "O CPF/CNPJ deve ter entre 11 e 14 dígitos.", "alert-warning");
        return;
    }

    // Desabilita o botão e muda o texto para indicar processamento
    if (botaoSubmit) {
        botaoSubmit.disabled = true;
        botaoSubmit.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processando...`;
    }

    exibirFeedback('register-feedback', "Enviando dados...", "alert-info");

    try {
        const response = await register(nome, email, cpfcnpjLimpo, senha);
        
        if (response.status === 201 || response.ok) {
            exibirFeedback('register-feedback', "Cadastro criado com sucesso!", "alert-success");

            // Fecha o modal automaticamente após 1 segundo
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
            }, 1000);
        } else if (response.status === 400) {
            const errorData = await response.json();
            const mensagemErro = errorData.mensagem || errorData.error || errorData.message || "Erro de validação nos dados enviados.";
            exibirFeedback('register-feedback', mensagemErro, "alert-danger");
        } else {
            exibirFeedback('register-feedback', "Erro ao realizar o cadastro. Verifique as informações.", "alert-danger");
        }
    } catch (error) {
        exibirFeedback('register-feedback', "Falha ao se conectar com o servidor.", "alert-danger");
    } finally {
        restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
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
            // Se o token estiver expirado ou for inválido, limpa a sessão
            executarLogout();
        }
    } catch (error) {
        exibirFeedback('profile-feedback', "Falha ao se conectar com o servidor.", "alert-danger");
    }
}

/***************************************************************************************/

async function executarAtualizacaoPerfil() {
    const botaoSubmit = document.querySelector('#profile-form button[type="submit"]');
    const botaoSubmitTextoOriginal = botaoSubmit ? botaoSubmit.innerHTML : "";

    const nome = document.getElementById('profile-nome').value;
    const email = document.getElementById('profile-email').value;
    const senha = document.getElementById('profile-senha').value;

    exibirFeedback('profile-feedback', "Atualizando cadastro...", "alert-info");

    // Desabilita o botão e muda o texto para indicar processamento
    if (botaoSubmit) {
        botaoSubmit.disabled = true;
        botaoSubmit.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Salvando...`;
    }

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
        } else if (response.status === 401) {
            executarLogout();
        } else {
            exibirFeedback('profile-feedback', "Erro ao atualizar o perfil. Verifique os dados inseridos.", "alert-danger");
        }
    } catch (error) {
        exibirFeedback('profile-feedback', "Falha ao se conectar com o servidor.", "alert-danger");
    } finally {
        restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
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

    // Atualiza a página
    window.location.reload();
}

/***************************************************************************************/
/* UTILITÁRIOS PUROS                                                                   */
/***************************************************************************************/

function restaurarBotao(botao, textoOriginal) {
    if (botao) {
        botao.disabled = false;
        botao.innerHTML = textoOriginal;
    }
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

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

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

function renderPosts(posts) {
    const grid = document.getElementById('posts-grid');
    if (!grid) return;
    
    if (posts.length === 0) {
        grid.innerHTML = `
            <div class="col-12 d-flex flex-column align-items-center justify-content-center text-center py-5 my-4">
                <div class="mb-3 text-secondary" style="font-size: 3rem;">
                    📭
                </div>
                <h4 class="fw-bold text-dark mb-1">Nenhum post encontrado</h4>
                <p class="text-muted small mb-0">Tente refinar sua busca ou volte mais tarde para ler novas histórias.</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = posts.map(post => `
        <div class="col-md-4 mb-4">
            <div class="card h-100">
                <div class="card-body">
                    <h5 class="card-title">${escapeHTML(post.titulo)}</h5>
                    <p class="card-text">${escapeHTML(post.conteudo.substring(0, 100))}...</p>
                </div>
            </div>
        </div>
    `).join('');
}
