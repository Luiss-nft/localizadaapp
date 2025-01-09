const { WebSocketServer } = require("ws");
const fs = require("fs");

// Inicializa o histórico das carretas para cada área
let carretaHistory = fs.existsSync("historico.json")
  ? JSON.parse(fs.readFileSync("historico.json"))
  : { 1401: [], 1402: [], 1418: [], 1417: [], 156009: [] };

// Inicializa o status das carret
let carretaStatus = { 
  1401: "Sem status", 
  1402: "Sem status", 
  1418: "Sem status", 
  1417: "Sem status", 
  156009: "Sem status" 
};

// Mapeamento para as classes de status e suas cores
const statusClasses = {
  "Sem status": { class: "SemStatus", color: "#808080" }, // Cinza
  "Em Percurso para o Campo": { class: "EmPercursoparaocampo", color: "#00FF00" }, // Verde
  "Aguardando Carregamento": { class: "AguardandoCarregamento", color: "#FFA500" }, // Laranja
  "Aguardando Descarregamento": { class: "AguardandoDescarregamento", color: "#0000FF" }, // Azul
  "Caminho para o Poço": { class: "CaminhoparaPoco", color: "#FFFF00" }, // Amarelo
  "Concluído": { class: "Concluido", color: "#008000" }, // Verde escuro
  "Cancelado": { class: "Cancelado", color: "#FF0000" } // Vermelho
};

// Inicia o WebSocket Server
const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", (ws) => {
  console.log("Novo cliente conectado.");

  // Envia o histórico inicial e o status ao cliente
  ws.send(JSON.stringify({ type: "init", history: carretaHistory, statuses: carretaStatus }));

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === "update") {
        const timestamp = new Date().toLocaleString();

        // Atualiza o histórico da carreta com base na área (carregamento ou descarregamento)
        if (!carretaHistory[data.carreta]) {
          carretaHistory[data.carreta] = [];
        }

        carretaHistory[data.carreta].push({
          action: data.action,
          time: timestamp,
        });

        // Atualiza o status
        carretaStatus[data.carreta] = data.status;

        // Salva o histórico no arquivo
        fs.writeFileSync("historico.json", JSON.stringify(carretaHistory, null, 2));

        // Envia a atualização para todos os clientes conectados
        wss.clients.forEach((client) => {
          if (client.readyState === ws.OPEN) {
            client.send(
              JSON.stringify({
                type: "update",
                carreta: data.carreta,
                status: data.status,
                statusClass: statusClasses[data.status]?.class || "SemStatus", // Envia a classe do status
                statusColor: statusClasses[data.status]?.color || "#808080", // Envia a cor do status
                history: carretaHistory[data.carreta],
                area: data.area, // Especificando a área (carregamento ou descarregamento)
              })
            );
          }
        });

        console.log(`Carreta ${data.carreta}: ${data.action} registrada às ${timestamp}`);
      }

      if (data.type === "clearHistory") {
        // Limpa o histórico para todas as carretas
        for (let carreta in carretaHistory) {
          carretaHistory[carreta] = [];
          carretaStatus[carreta] = 'Sem status';
        }

        // Salva a limpeza no arquivo
        fs.writeFileSync("historico.json", JSON.stringify(carretaHistory, null, 2));

        // Envia a limpeza para todos os clientes conectados
        wss.clients.forEach((client) => {
          if (client.readyState === ws.OPEN) {
            client.send(
              JSON.stringify({
                type: "clearHistory",
                statuses: carretaStatus, // Envia o novo status de todas as carretas
              })
            );
          }
        });

        console.log("Histórico limpo de todas as carretas.");
      }

    } catch (err) {
      console.error("Erro ao processar mensagem:", err);
    }
  });

  ws.on("close", () => {
    console.log("Cliente desconectado.");
  });
});

console.log("Servidor WebSocket rodando na porta 8080");
