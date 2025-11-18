// Gera nomes como: recorder-20250915-081530.m4a
export function buildRecordingName(
    srcUri: string,
    prefix = "recorder",
    date = new Date()
) {
    const ext = "." + (srcUri.split(".").pop() || "m4a").toLowerCase();

    const yyyy = String(date.getFullYear());
    const MM = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const HH = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    const ss = String(date.getSeconds()).padStart(2, "0");

    const stamp = `${yyyy}${MM}${dd}-${HH}${mm}${ss}`;
    return `${prefix}-${stamp}${ext}`;
}
