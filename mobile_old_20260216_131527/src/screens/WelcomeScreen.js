import { StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import Button from '../components/Button';
import Card from '../components/Card';
import { colors } from '../theme/colors';

export default function WelcomeScreen({ navigation }) {
  return (
    <Screen scroll={false}>
      <View style={styles.hero}>
        <Text style={styles.brand}>SideQuest</Text>
        <Text style={styles.tagline}>Family habits, points, and rewards in one playful app.</Text>
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Choose your login</Text>
        <Button title="Parent Login" onPress={() => navigation.navigate('ParentLogin')} />
        <Button title="Parent Sign Up" tone="secondary" onPress={() => navigation.navigate('ParentSignup')} />
        <Button title="Child Login" tone="secondary" onPress={() => navigation.navigate('ChildLogin')} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flex: 1,
    justifyContent: 'center',
    gap: 8
  },
  brand: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.primaryDark
  },
  tagline: {
    fontSize: 16,
    color: colors.textMuted
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6
  }
});
