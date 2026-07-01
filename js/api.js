const API_URL = 'http://localhost:8000';

/***************************************************************************************/
/* AUXILIARES DE REQUISIÇÃO                                                            */
/***************************************************************************************/

// Função interna para obter os headers padrões com ou sem autenticação
function getHeaders(exigeAutenticacao = false) {
    const headers = { 'Content-Type': 'application/json' };
    if (exigeAutenticacao) {
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }
    return headers;
}

/***************************************************************************************/
/* AUTENTICAÇÃO                                                                        */
/***************************************************************************************/

async function register(nome, email, cpfcnpj, senha) {
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: getHeaders(false),
            body: JSON.stringify({ nome, email, cpfcnpj, senha })
        });
        return response;
    } catch (error) {
        console.error("Falha de rede ao tentar registrar:", error);
        
        // Recombina o erro para tratamento visual no app.js
        throw error;
    }
}

/***************************************************************************************/

async function login(cpfcnpj, senha) {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: getHeaders(false),
            body: JSON.stringify({ cpfcnpj, senha })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.token) {
                localStorage.setItem('token', data.token);
            }
        }
        return response;
    } catch (error) {
        console.error("Falha de rede ao tentar fazer login:", error);
        throw error;
    }
}

/***************************************************************************************/
/* USUÁRIO / PERFIL                                                                    */
/***************************************************************************************/

async function fetchUserProfile() {
    try {
        const response = await fetch(`${API_URL}/user/profile`, {
            method: 'GET',
            headers: getHeaders(true)
        });
        return response;
    } catch (error) {
        console.error("Falha de rede ao buscar perfil do usuário:", error);
        throw error;
    }
}

/***************************************************************************************/

async function updateUserProfile(nome, email, senha) {
    try {
        const bodyData = {};
        if (nome) bodyData.nome = nome;
        if (email) bodyData.email = email;
        if (senha) bodyData.senha = senha;

        const response = await fetch(`${API_URL}/user/profile`, {
            method: 'PUT',
            headers: getHeaders(true),
            body: JSON.stringify(bodyData)
        });
        return response;
    } catch (error) {
        console.error("Falha de rede ao atualizar perfil do usuário:", error);
        throw error;
    }
}

/***************************************************************************************/
/* POSTS                                                                               */
/***************************************************************************************/

async function fetchPosts(titulo = '') {
    const url = titulo ? `${API_URL}/posts/?titulo=${titulo}` : `${API_URL}/posts/`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error("Erro na resposta da API:", response.status);
            return [];
        }
        return await response.json();
    } catch (error) {
        console.error("Falha ao conectar na API de posts:", error);
        return [];
    }
}