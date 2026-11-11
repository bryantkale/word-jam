/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { StatusBar, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

type AppProps = {
    userId?: string;
    token?: string;
};

function App(props: AppProps) {
    const isDarkMode = useColorScheme() === 'dark';
    return (
        <SafeAreaProvider>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
            <AppContent props={props} />
        </SafeAreaProvider>
    );
}

function AppContent({ props }: { props: AppProps }) {
    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Hello World</Text>
                <Text style={styles.title}>UserID: {props.userId}</Text>
                <Text style={styles.title}>Token: {props.token}</Text>
            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
});

export default App;
