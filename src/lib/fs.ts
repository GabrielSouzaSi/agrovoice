import * as FileSystem from "expo-file-system";

/**
 * Move um arquivo local (ex.: do cache) para o armazenamento persistente do app.
 * - srcUri: ex. "file:///data/user/0/<bundle>/cache/Audio/recording-....m4a"
 * - targetSubdir: subpasta em documentDirectory (default: "recordings")
 * - overwrite: se true, sobrescreve se já existir (default: false)
 * Retorna o novo URI.
 */

export async function persistFromCache(
    srcUri: string,
    {
        targetSubdir = "recordings",
        overwrite = false,
        filename, // opcional: force um nome (mantém extensão se faltar)
    }: { targetSubdir?: string; overwrite?: boolean; filename?: string } = {}
): Promise<{ uri: string; name: string; size?: number }> {
    if (!srcUri?.startsWith("file://")) {
        throw new Error("A URI precisa ser local (file://).");
    }

    const baseDir = FileSystem.documentDirectory;
    if (!baseDir) {
        throw new Error("documentDirectory indisponível nesta plataforma.");
    }

    // Garante a pasta de destino
    const dir = baseDir + targetSubdir.replace(/^\/+|\/+$/g, "") + "/";
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }

    // Extrai nome do arquivo de origem
    const srcName = srcUri.split("/").pop() || `file-${Date.now()}`;
    const srcExt = (srcName.match(/\.[a-z0-9]+$/i)?.[0]) ?? "";

    // Define o nome final
    let safeName = (filename || srcName)
        .replace(/[/\\?%*:|"<>]/g, "_") // sanitiza
        .replace(/\s+/g, " ")
        .trim();

    // Se o filename custom veio sem extensão, preserva a original
    if (filename && !/\.[a-z0-9]+$/i.test(filename) && srcExt) {
        safeName += srcExt;
    }

    let destUri = dir + safeName;

    // Evita colisão se não for para sobrescrever
    if (!overwrite) {
        const info = await FileSystem.getInfoAsync(destUri);
        if (info.exists) {
            const [nameOnly, ext = ""] = safeName.split(/\.(?=[^\.]+$)/);
            const unique = `${nameOnly}-${Date.now()}${ext ? "." + ext : ""}`;
            destUri = dir + unique;
            safeName = unique;
        }
    } else {
        // Se for sobrescrever, apaga antes
        const info = await FileSystem.getInfoAsync(destUri);
        if (info.exists) {
            await FileSystem.deleteAsync(destUri, { idempotent: true });
        }
    }

    // MOVE (remove do cache automaticamente)
    await FileSystem.moveAsync({ from: srcUri, to: destUri });

    const finalInfo = await FileSystem.getInfoAsync(destUri);
    return { uri: destUri, name: safeName, size: (finalInfo as any)?.size };
}
