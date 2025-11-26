// Crie um novo arquivo: components/SoundWave.tsx

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

// Número de barras que compõem a onda
const NUM_BARS = 20; 
const BAR_WIDTH = 4;

// Componente que desenha a onda sonora.
export function SoundWave({ isRecording, currentVolume = 0.5 }: { isRecording: boolean, currentVolume: number }) {
  
  // Array de valores compartilhados para animar a altura de cada barra
  const barHeights = React.useMemo(() => 
    Array.from({ length: NUM_BARS }, () => useSharedValue(2))
  , []);
  
  // Efeito principal: Atualiza a altura das barras com base no volume
  React.useEffect(() => {
    if (isRecording) {
      barHeights.forEach((height, index) => {
        // Gera um volume base (para que não fiquem todas iguais)
        const fluctuation = 0.5 + Math.sin(index) * 0.5; 
        
        // Altura final = Volume atual * Altura Máxima * Flutuação
        const newHeight = currentVolume * 50 * fluctuation; 
        
        // Anima a altura de forma suave (withSpring)
        height.value = withSpring(Math.max(2, newHeight), { damping: 10, stiffness: 100 });
      });
    } else {
      // Quando não está gravando, as barras voltam para a altura mínima
      barHeights.forEach(height => {
        height.value = withSpring(2);
      });
    }
  }, [isRecording, currentVolume, barHeights]);


  return (
    <View style={styles.container}>
      {barHeights.map((height, index) => {
        // Estilo animado para cada barra
        const animatedStyle = useAnimatedStyle(() => ({
          height: height.value,
        }));
        
        return (
          <Animated.View
            key={index}
            style={[styles.bar, animatedStyle]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 60, // Altura total da área da onda
  },
  bar: {
    width: BAR_WIDTH,
    marginHorizontal: 1.5,
    borderRadius: 2,
    // Gradiente Roxo/Rosa (como na sua imagem)
    backgroundColor: 'linear-gradient(90deg, #9333ea 0%, #d946ef 100%)', 
    // Como estamos em React Native, para o gradiente, você teria que usar <LinearGradient> aqui. 
    // Use uma cor sólida por enquanto, como: backgroundColor: '#A855F7', 
  },
});