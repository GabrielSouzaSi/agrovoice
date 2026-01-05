import { getPragaNotSynced, markPragaAsSynced } from "@/database/praga";
import { getRecordersNotSynced, markRecorderAsSynced } from "@/database/recorder";
import { authService } from "./auth";

const SYNC_API_URL = 'https://api.simids.cpafrr.embrapa.br/api/sync/'; // Exemplo de URL

export const syncService = {
    async syncData() {
        try {
            const token = await authService.getToken();
            if (!token) {
                console.log("Sync: No token found, skipping sync.");
                return;
            }

            // 1. Buscar dados não sincronizados
            const pragas = await getPragaNotSynced() || [];
            const recorders = await getRecordersNotSynced() || [];

            if (pragas.length === 0 && recorders.length === 0) {
                console.log("Sync: No data to sync.");
                return { status: "no_data" };
            }

            // 2. Montar o JSON conforme planejado
            const syncPayload = {
                timestamp: new Date().toISOString(),
                tables: {
                    praga: pragas,
                    recorders: recorders
                }
            };

            // 3. Enviar para a API
            const response = await fetch(SYNC_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(syncPayload)
            });

            if (!response.ok) {
                throw new Error(`Sync failed with status ${response.status}`);
            }

            const result = await response.json();

            // 4. Processar resposta e marcar como sincronizado
            if (result.results) {
                if (result.results.praga) {
                    for (const item of result.results.praga) {
                        if (item.status === "synced") {
                            await markPragaAsSynced(item.id);
                        }
                    }
                }

                if (result.results.recorders) {
                    for (const item of result.results.recorders) {
                        if (item.status === "synced") {
                            await markRecorderAsSynced(item.id);
                        }
                    }
                }
            }

            return { status: "success", result };

        } catch (error) {
            console.error("Sync error:", error);
            throw error;
        }
    }
};
