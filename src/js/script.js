// --- Variáveis Globais ---
let nossosDados = {}; // Guarda os dados do dados.json
let mapaPlanejamento; // Guarda o objeto do mapa 1
let mapaBusca; // Guarda o objeto do mapa 2
let marcadoresPlanejamento = []; // Lista de pins do mapa 1
let marcadoresBusca = []; // Lista de pins do mapa 2
let locaisFiltradosPlanejamento = []; // Guarda os locais do planejamento para o botão de rota

const centroSJC = { lat: -23.223701, lng: -45.900907 }; // Centro de SJC

/**
 * Função de inicialização principal.
 * É chamada pelo 'callback=initApp' do script do Google Maps.
 */
async function initApp() {
    try {
        // Carrega a biblioteca de marcadores avançados
        const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
        
        // Carrega os dados do JSON
        const response = await fetch('../assets/dados.json');
        if (!response.ok) {
            throw new Error(`Erro ao carregar dados.json: ${response.statusText}`);
        }
        nossosDados = await response.json();
        
        // Inicia os ouvintes de eventos
        iniciarOuvintes(AdvancedMarkerElement); 
    } catch (error) {
        console.error("Falha ao carregar dados.json ou biblioteca do Google:", error);
        alert("Não foi possível carregar os dados dos locais. Tente recarregar a página.");
    }
}

/**
 * ATUALIZAÇÃO: Nova função para verificar o status de funcionamento
 * @param {object} local - O objeto do local do dados.json
 * @returns {object} - Um objeto com { status: 'Aberto'/'Fechado', cor: 'cor-css' }
 */
function verificarStatusAberto(local) {
    // Horário padrão dos PEVs
    const horario = {
        segSab: { abre: 8, fecha: 17 },
        dom: { abre: 8, fecha: 12 }
    };

    try {
        const agora = new Date();
        const diaSemana = agora.getDay(); // 0=Domingo, 1=Segunda, ..., 6=Sábado
        const hora = agora.getHours();

        if (diaSemana >= 1 && diaSemana <= 6) { // Segunda a Sábado
            if (hora >= horario.segSab.abre && hora < horario.segSab.fecha) {
                return { status: 'Aberto agora', cor: '#0F7F67' }; // Verde
            }
        } else if (diaSemana === 0) { // Domingo
            if (hora >= horario.dom.abre && hora < horario.dom.fecha) {
                return { status: 'Aberto agora', cor: '#0F7F67' }; // Verde
            }
        }
        
        // Se não caiu em nenhum caso de "aberto", está fechado
        return { status: 'Fechado agora', cor: '#B22222' }; // Vermelho Escuro

    } catch (e) {
        // Em caso de erro na lógica, retorna um status neutro
        return { status: local.horario, cor: '#666' };
    }
}

/**
 * Função para iniciar todos os ouvintes de eventos
 * @param {google.maps.marker.AdvancedMarkerElement} AdvancedMarkerElement - A classe do marcador avançado
 */
function iniciarOuvintes(AdvancedMarkerElement) {
    // --- Seletores dos Elementos ---
    const btnComecar = document.getElementById("btn-comecar");
    const modalSheet = document.getElementById("modal-sheet");
    const modalHandle = document.getElementById("modal-handle");
    const btnShowPlanejamento = document.getElementById("btn-show-planejamento");
    const btnShowBuscar = document.getElementById("btn-show-buscar");
    const formPlanejamento = document.getElementById("form-planejamento");
    const formBuscar = document.getElementById("form-buscar");
    const views = document.querySelectorAll(".modal-view");
    const shortcutButtons = document.querySelectorAll(".shortcut-btn");
    const btnGerarRota = document.getElementById("btn-gerar-rota"); // ATUALIZAÇÃO: Novo botão

    // --- Funções Auxiliares de UI ---
    function abrirModal() {
        modalSheet.classList.add("active");
        mostrarView("view-options");
    }

    function fecharModal() {
        modalSheet.classList.remove("active");
    }

    function mostrarView(viewId) {
        views.forEach(view => view.classList.add("hidden"));
        const viewParaMostrar = document.getElementById(viewId);
        if (viewParaMostrar) {
            viewParaMostrar.classList.remove("hidden");
            viewParaMostrar.closest('.modal-content').scrollTop = 0;
        }
    }

    // --- Funções do Mapa ---

    function inicializarMapa(mapId) {
        const mapElement = document.getElementById(mapId);
        if (!mapElement) return null;
        
        return new google.maps.Map(mapElement, {
            zoom: 12,
            center: centroSJC,
            disableDefaultUI: true,
            zoomControl: true,
            mapId: "E_COLETA_SJC_MAP_ID" 
        });
    }

    /**
     * Adiciona um "pin" (marcador) ao mapa
     */
    function adicionarMarcador(mapa, local, listaDeMarcadores) {
        
        const marker = new AdvancedMarkerElement({
            position: { lat: local.lat, lng: local.lng },
            map: mapa,
            title: local.nome,
        });

        // ATUALIZAÇÃO: Chama a função de status
        const statusLocal = verificarStatusAberto(local);

        // ATUALIZAÇÃO: Nova janela de informação (mais bonita e completa)
        const infowindow = new google.maps.InfoWindow({
            content: `
                <div style="font-family: Arial, sans-serif; max-width: 280px; padding: 5px;">
                    <h4 style="margin: 0 0 8px 0; color: #0F7F67; font-size: 16px;">${local.nome}</h4>
                    
                    <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold; color: ${statusLocal.cor};">
                        ${statusLocal.status}
                    </p>
                    
                    <p style="margin: 0 0 5px 0; font-size: 13px; color: #333;">${local.endereco}</p>
                    <p style="margin: 0 0 10px 0; font-size: 13px; color: #333;"><strong>Horário:</strong> ${local.horario}</p>
                    
                    <strong style="font-size: 13px; color: #333;">Aceita:</strong>
                    <ul style="font-size: 12px; margin: 5px 0 0 15px; padding: 0; max-height: 100px; overflow-y: auto; list-style-position: inside;">
                        ${local.tipos.map(tipo => `<li style="padding-bottom: 2px;">${tipo}</li>`).join('')}
                    </ul>
                </div>
            `,
        });

        marker.addListener("click", () => {
            infowindow.open({ map: mapa });
            infowindow.setPosition(marker.position);
        });

        listaDeMarcadores.push(marker);
    }

    /**
     * Limpa todos os marcadores de um mapa
     */
    function limparMarcadores(listaDeMarcadores) {
        for (let i = 0; i < listaDeMarcadores.length; i++) {
            listaDeMarcadores[i].map = null;
        }
        listaDeMarcadores.length = 0; 
    }

    // --- Processamento dos Formulários ---

    // 5. Envio do Formulário de Planejamento
    formPlanejamento.addEventListener("submit", (event) => {
        event.preventDefault(); 
        
        const bairroId = document.getElementById("bairro").value;
        const itensString = document.getElementById("itens").value;
        
        const dadosColeta = nossosDados.coleta[bairroId];
        const resultadoDias = document.getElementById("resultado-coleta-dias");
        const resultadoHorario = document.getElementById("resultado-coleta-horario");
        
        if (dadosColeta) {
            resultadoDias.textContent = dadosColeta.dias;
            resultadoHorario.textContent = dadosColeta.periodo;
        } else {
            resultadoDias.textContent = "Informação não encontrada para este bairro.";
            resultadoHorario.textContent = "Tente selecionar outro bairro.";
        }

        const tituloItens = document.getElementById("resultado-itens-titulo");
        tituloItens.textContent = `Descarte de Itens Específicos (${itensString || "Todos"})`;

        mostrarView("view-planejamento-resultado");

        if (!mapaPlanejamento) {
            mapaPlanejamento = inicializarMapa("mapa-planejamento");
        }
        limparMarcadores(marcadoresPlanejamento);

        const filtros = itensString.toLowerCase().split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        let locaisFiltrados;

        if (filtros.length === 0) {
            locaisFiltrados = nossosDados.locais;
        } else {
            locaisFiltrados = nossosDados.locais.filter(local => {
                const tiposDoLocal = local.tipos.map(t => t.toLowerCase());
                return filtros.some(filtro => tiposDoLocal.some(tipo => tipo.includes(filtro)));
            });
        }
        
        // ATUALIZAÇÃO: Salva os locais filtrados para o botão de rota
        locaisFiltradosPlanejamento = locaisFiltrados;
        
        locaisFiltrados.forEach(local => {
            adicionarMarcador(mapaPlanejamento, local, marcadoresPlanejamento);
        });
    });

    // 6. Envio do Formulário de Busca
    formBuscar.addEventListener("submit", (event) => {
        event.preventDefault(); 
        
        const filtro = document.getElementById("filtro-tipo-lixo").value;
        
        if (!filtro) {
            alert("Por favor, selecione um tipo de lixo clicando em um dos botões.");
            return;
        }

        mostrarView("view-buscar-locais-resultado");

        if (!mapaBusca) {
            mapaBusca = inicializarMapa("mapa-busca");
        }
        limparMarcadores(marcadoresBusca);

        const locaisFiltrados = nossosDados.locais.filter(local => 
            local.tipos.includes(filtro)
        );

        if (locaisFiltrados.length === 0) {
            alert(`Nenhum PEV encontrado que aceite "${filtro}".`);
        }
        
        locaisFiltrados.forEach(local => {
            adicionarMarcador(mapaBusca, local, marcadoresBusca);
        });
    });

    // 7. Botões de Atalho (Shortcuts)
    shortcutButtons.forEach(button => {
        button.addEventListener("click", () => {
            const form = button.closest('form');
            
            if (form.id === 'form-planejamento') {
                const inputItens = document.getElementById("itens");
                const textoBotao = button.textContent; 
                
                if (inputItens.value === "") {
                    inputItens.value = textoBotao;
                } else {
                    inputItens.value += `, ${textoBotao}`;
                }

            } else if (form.id === 'form-buscar') {
                const filtro = button.dataset.filtro; 
                document.getElementById("filtro-tipo-lixo").value = filtro;
                
                form.querySelectorAll('.shortcut-btn').forEach(btn => {
                    btn.classList.remove('selected');
                });
                
                button.classList.add('selected');
            }
        });
    });

    // --- ATUALIZAÇÃO: Novo Listener para o Botão de Rota ---
    btnGerarRota.addEventListener("click", () => {
        if (locaisFiltradosPlanejamento.length === 0) {
            alert("Não há pontos de descarte no mapa para gerar uma rota.");
            return;
        }

        // 1. Pedir localização ao usuário
        if (!navigator.geolocation) {
            alert("Seu navegador não suporta geolocalização.");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (posicao) => {
                // 2. Sucesso: Pegou a localização
                const userLat = posicao.coords.latitude;
                const userLng = posicao.coords.longitude;
                const origem = `${userLat},${userLng}`;

                // 3. Preparar os pontos de parada (waypoints)
                // Clonamos o array para não modificar o original
                const pontos = [...locaisFiltradosPlanejamento];
                
                let url = `https://www.google.com/maps/dir/?api=1&origin=${origem}`;

                if (pontos.length === 1) {
                    // Se só tem 1 ponto, ele é o destino
                    url += `&destination=${pontos[0].lat},${pontos[0].lng}`;
                } else {
                    // Se tem mais de 1, o último é o destino e os outros são waypoints
                    const destino = pontos.pop(); // Remove e retorna o último item
                    const destinoStr = `${destino.lat},${destino.lng}`;
                    
                    const waypoints = pontos
                        .map(local => `${local.lat},${local.lng}`)
                        .join('|'); // Formato de waypoints do Google Maps
                    
                    url += `&destination=${destinoStr}&waypoints=${waypoints}`;
                }
                
                // 4. Abrir o Google Maps em nova aba
                window.open(url, '_blank');
            },
            (erro) => {
                // 2. Erro: Não conseguiu pegar a localização
                console.error("Erro ao obter localização:", erro.message);
                alert("Não foi possível obter sua localização. Verifique as permissões do navegador.");
            }
        );
    });

    // --- Event Listeners Básicos (Ouvintes de Ação) ---
    btnComecar.addEventListener("click", abrirModal);
    modalHandle.addEventListener("click", fecharModal);
    btnShowPlanejamento.addEventListener("click", () => mostrarView("view-planejamento-form"));
    btnShowBuscar.addEventListener("click", () => {
        mostrarView("view-buscar-locais-form");
        document.getElementById("filtro-tipo-lixo").value = "";
        formBuscar.querySelectorAll('.shortcut-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
    });
}