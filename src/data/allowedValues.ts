import { getConfig } from "@/database/config";
import { useEffect, useState } from "react";

export const DEFAULT_OBJECTIVES = [
    "Plantio",
    "Pulverização",
    "Vistoria",
    "Adubação",
    "Manejo"
];

export const DEFAULT_PROPERTIES = [
    "Fazenda Santa Maria",
    "Fazenda São João",
    "Sítio Boa Vista",
    "Fazenda Esperança",
    "Rancho Fundo"
];

export const DEFAULT_FIELDS = [
    "zero um", "zero dois", "zero tres", "zero quatro", "zero cinco",
    "zero seis", "zero sete", "zero oito", "zero nove", "zero dez"
];

// Fallback constants for backward compatibility if needed, 
// but we should prefer the hook or async getter.
export const ALLOWED_OBJECTIVES = DEFAULT_OBJECTIVES;
export const ALLOWED_PROPERTIES = DEFAULT_PROPERTIES;
export const ALLOWED_FIELDS = DEFAULT_FIELDS;

export function useAllowedValues() {
    const [objectives, setObjectives] = useState<string[]>(DEFAULT_OBJECTIVES);
    const [properties, setProperties] = useState<string[]>(DEFAULT_PROPERTIES);
    const [fields, setFields] = useState<string[]>(DEFAULT_FIELDS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const config = await getConfig('current_config');

                if (config) {
                    if (config.objetivos_list) setObjectives(config.objetivos_list);
                    if (config.property_list) setProperties(config.property_list);
                    if (config.fields_list) setFields(config.fields_list);
                }
            } catch (error) {
                console.error("Error loading allowed values:", error);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    return { objectives, properties, fields, loading };
}
