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

            if (data.user_id) {
                localStorage.setItem('user_id', data.user_id);
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
/* BLOGS                                                                               */
/***************************************************************************************/

async function fetchBlogs(userId = '', page = 1, perPage = 6) {
    let url = `${API_URL}/blogs/?page=${page}&per_page=${perPage}`;
    if (userId) {
        url += `&user_id=${userId}`;
    }

    const tokenExiste = !!localStorage.getItem('token');

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: getHeaders(tokenExiste) 
        });

        if (!response.ok) {
            console.error("Erro na resposta da API de blogs:", response.status);
            return [];
        }
        return await response.json();
    } catch (error) {
        console.error("Falha ao conectar na API de blogs:", error);
        throw error;
    }
}

async function createBlog(nome, imagem = '') {
    try {
        const bodyData = { nome };
        if (imagem) bodyData.imagem = imagem;

        const response = await fetch(`${API_URL}/blogs/`, {
            method: 'POST',
            headers: getHeaders(true), // Exige token JWT
            body: JSON.stringify(bodyData)
        });
        return response;
    } catch (error) {
        console.error("Falha de rede ao tentar criar blog:", error);
        throw error;
    }
}

async function updateBlog(id, nome, imagem = '') {
    try {
        const bodyData = {};
        if (nome) bodyData.nome = nome;
        if (imagem) bodyData.imagem = imagem;

        const response = await fetch(`${API_URL}/blogs/${id}`, {
            method: 'PUT',
            headers: getHeaders(true), // Exige token JWT
            body: JSON.stringify(bodyData)
        });
        return response;
    } catch (error) {
        console.error(`Falha de rede ao tentar editar o blog ${id}:`, error);
        throw error;
    }
}

async function deleteBlog(id) {
    try {
        const response = await fetch(`${API_URL}/blogs/${id}`, {
            method: 'DELETE',
            headers: getHeaders(true), // Exige token JWT
        });
        return response;
    } catch (error) {
        console.error(`Falha de rede ao tentar excluir o blog ${id}:`, error);
        throw error;
    }
}

/***************************************************************************************/
/* POSTS                                                                               */
/***************************************************************************************/

async function fetchPosts(blogId = '', page = 1, perPage = 6, titulo = '') {
    // Mantendo a estrutura de construção de URL usada em fetchBlogs[cite: 3]
    let url = `${API_URL}/posts/?page=${page}&per_page=${perPage}`;
    
    if (blogId) url += `&blog_id=${blogId}`;
    if (titulo) url += `&titulo=${titulo}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: getHeaders(false) // Segue o padrão de headers do blog[cite: 3]
        });

        if (!response.ok) {
            console.error("Erro na resposta da API de posts:", response.status);
            return [];
        }
        return await response.json();
    } catch (error) {
        console.error("Falha ao conectar na API de posts:", error);
        throw error;
    }
}

async function createPost(blogId, titulo, conteudo, imagem = '') {
    try {
        const bodyData = { 
            blog_id: parseInt(blogId), 
            titulo,
            conteudo
        };
        
        if (imagem) {
            bodyData.imagem = imagem;
        }

        const response = await fetch(`${API_URL}/posts/`, {
            method: 'POST',
            headers: getHeaders(true), // Exige token JWT conforme padrão
            body: JSON.stringify(bodyData)
        });

        return response;
    } catch (error) {
        console.error(`Falha de rede ao tentar criar o post no blog ${blogId}:`, error);
        throw error;
    }
}

async function updatePost(id, postId, titulo, conteudo, imagem = '') {
    try {
        const bodyData = {};
        if (postId) bodyData.postId = postId;
        if (titulo) bodyData.titulo = titulo;
        if (conteudo) bodyData.conteudo = conteudo;
        if (imagem) bodyData.imagem = imagem;

        const response = await fetch(`${API_URL}/posts/${id}`, {
            method: 'PUT',
            headers: getHeaders(true), // Exige token JWT
            body: JSON.stringify(bodyData)
        });
        return response;
    } catch (error) {
        console.error(`Falha de rede ao tentar editar o post ${id}:`, error);
        throw error;
    }
}

async function deletePost(id) {
    try {
        const response = await fetch(`${API_URL}/posts/${id}`, {
            method: 'DELETE',
            headers: getHeaders(true), // Exige token JWT
        });
        return response;
    } catch (error) {
        console.error(`Falha de rede ao tentar excluir o post ${id}:`, error);
        throw error;
    }
}