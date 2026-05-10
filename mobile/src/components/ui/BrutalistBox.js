import { StyleSheet, View } from 'react-native';
import { ONE_BIT } from './oneBitTheme';

/**
 * Full-width 1-bit container: hard border with emphasized bottom edge (4px).
 */
export default function BrutalistBox({ children, style, ...rest }) {
  return (
    <View style={[styles.box, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: ONE_BIT.background,
    borderWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.borderColor,
    borderBottomWidth: 4,
    borderRadius: ONE_BIT.radius
  }
});
