import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Edit, Trash2, CloudUpload } from 'lucide-react-native';
import { colors } from '@/styles/colors';
import { PragaDTO } from '@/dtos/pragaDTO';
import React from 'react';



const ActionButtons = ({ onDelete, onEdit, onSync }: { onDelete: () => void, onEdit: () => void, onSync: () => void }) => (
    <View className="flex-row justify-around p-4 border-t border-gray-700 bg-gray-900">
        <TouchableOpacity onPress={onEdit} className="p-3 items-center">
            <Edit size={24} color={colors.blue[400]} />
            <Text className="text-yellow-500 text-xs mt-1">Editar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={onDelete} className="p-3 items-center">
            <Trash2 size={24} color={colors.red[500]} />
            <Text className="text-red-500 text-xs mt-1">Deletar</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onSync} className="p-3 items-center">
            <CloudUpload size={24} color={colors.green[500]} />
            <Text className="text-green-500 text-xs mt-1">Sincronizar</Text>
        </TouchableOpacity>
    </View>
);


export default function PragaDetailScreen() {
    const router = useRouter();
    
    const params = useLocalSearchParams();
    
   
    const item: PragaDTO = params as unknown as PragaDTO;
    
    if (!item.id) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-900">
                <Text className="text-white">Item não encontrado.</Text>
            </View>
        );
    }
    
   
    const handleDelete = () => {
        Alert.alert("Confirmação", "Tem certeza que deseja deletar este registro?", [
            { text: "Cancelar", style: "cancel" },
            { 
                text: "Deletar", 
                onPress: () => {
                    // ⚠️ Lógica de exclusão no banco de dados aqui
                    console.log(`Deletando item com ID: ${item.id}`);
                    router.back(); // Volta para a tela anterior após deletar
                },
                style: "destructive"
            },
        ]);
    };
    
    const handleEdit = () => {
        console.log(`Editando item com ID: ${item.id}`);
    };
    
    const handleSync = () => {
        console.log(`Sincronizando item com ID: ${item.id}`);
        Alert.alert("Sincronização", "Registro enviado para o servidor!");
    };

    // Função auxiliar para formatar a data/hora
    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleString('pt-BR');
        } catch {
            return dateString;
        }
    }

    const DetailField = ({ label, value }: { label: string, value: string }) => (
        <View className="mb-4 p-3 bg-gray-800 rounded-lg">
            <Text className="text-gray-400 font-medium text-xs uppercase">{label}</Text>
            <Text className="text-white-500 text-base mt-1">{value}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <View className="p-5 flex-1">
                <Text className="text-2xl font-bold text-white-500 mb-6">
                    Detalhes da Gravação #{item.id}
                </Text>

                <View className="flex-1">
                    <DetailField label="Nome da Praga" value={item.praga || "N/A"} />
                    <DetailField label="Fazenda/Local" value={item.fazenda || "N/A"} />
                    <DetailField label="Descrição" value={item.description || "Nenhuma descrição."} />
                    <DetailField label="Data e Hora" value={formatDate(item.datetime)} />
                    <DetailField 
                        label="Localização GPS" 
                        value={item.location.split(',').join(', ') || "Localização indisponível"} 
                    />
                </View>
                
            </View>
            <View className='left-0 bottom-10 right-0'>
            
            <ActionButtons 
                onDelete={handleDelete} 
                onEdit={handleEdit} 
                onSync={handleSync} 
            />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.gray[1000],
    },
});