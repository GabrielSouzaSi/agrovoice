import React from "react"
import { View, Text } from "react-native"
import ProjectParameters from "@/database/ProjectParameters"

export function ProjectInfoCard() {
    const projectConfig = ProjectParameters.getInstance().getConfig()

    return (
        <View className="w-full bg-gray-50 p-4 rounded-xl mb-4 border border-gray-200 shadow-sm">
            <Text className="text-xl font-bold text-gray-900 mb-2">{projectConfig.nome}</Text>
            <Text className="text-base text-gray-600 mb-4">{projectConfig.descricao}</Text>

            <View className="flex-col justify-between mb-2">
                <View>
                    <Text className="text-xs text-gray-500 font-bold uppercase">Local</Text>
                    <Text className="text-sm text-gray-800">{projectConfig.localizacao.fazenda}</Text>
                    <Text className="text-xs text-gray-600">{projectConfig.localizacao.municipio} - {projectConfig.localizacao.estado}</Text>
                </View>
                <View>
                    <Text className="text-xs text-gray-500 font-bold uppercase">Responsável</Text>
                    <Text className="text-sm text-gray-800">{projectConfig.responsavel.nome}</Text>
                </View>
            </View>

            <View className="mt-4 border-t border-gray-200 pt-4">
                <Text className="text-xs text-gray-500 font-bold uppercase mb-2">Tipos de Dados</Text>
                {projectConfig.tiposDeDados.map((td) => (
                    <View key={td.id} className="mb-2">
                        <Text className="text-sm font-semibold text-gray-800">
                            {td.nome} <Text className="text-gray-500 font-normal">({td.tipoBase})</Text>
                        </Text>
                        {td.opcoes && (
                            <Text className="text-xs text-gray-600">
                                Opções: {td.opcoes.join(", ")}
                            </Text>
                        )}
                    </View>
                ))}
            </View>
        </View>
    )
}
