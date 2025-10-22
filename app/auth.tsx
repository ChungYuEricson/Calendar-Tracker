import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { Button, Text, TextInput, useTheme } from "react-native-paper";
import { useAuth } from "../lib/auth-context";

export default function AuthScreen() {
    const [isSignUp, setSignUp] = useState<boolean>(false);
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const theme = useTheme();

    const {signIn, signUp} = useAuth();
    const router = useRouter();

    const handleAuth = async () => {
        if (!email || !password) {
            setError("Email or Password not filled");
            return;
        }

        if (password.length < 6){
            setError ("Passwords must be at at least 6 characters long.")
            return;
        }

        setError(null);

        if (isSignUp) {
            const error = await signUp(email, password);
            if (error){
                setError(error);
                return;
            }
        } else {
            const erro = await signIn(email,password);
             if (error){
                setError(error);
                return;
            }
            router.replace("/")
        }
    };

    const handleSignUp = () => {
        setSignUp((prev) => !prev);
    };

    return <KeyboardAvoidingView
     behavior={Platform.OS === "ios" ? "padding" : "height"}
     style = {styles.container}
     >
        <View style = {styles.content}>
            <Text style={styles.title}>{isSignUp? "Create Account" : "Log In"}</Text>
            <TextInput 
                label="Email" 
                autoCapitalize="none" 
                keyboardType="email-address"
                placeholder="example@email.com"
                mode= "outlined"
                onChangeText = {setEmail}
                />

            <TextInput 
                label="Password" 
                autoCapitalize="none" 
                keyboardType="email-address"
                placeholder="Password"
                mode= "outlined"
                secureTextEntry
                onChangeText = {setPassword}
            />

            {error && (
                <Text style = {styles.error}> {error}</Text>
            )}

            <Button style = {styles.button} 
                    mode = "contained"
                    onPress = {handleAuth}>
                        {isSignUp? "Sign Up" : "Sign In"}
            </Button>
            <Button onPress={handleSignUp}>{isSignUp? "Already have an account? Sign In" : "Don't have an account? Sign Up"}</Button>
        </View>

    </KeyboardAvoidingView>
}


const styles = StyleSheet.create({
    container: {
        flex:1,
        backgroundColor: "#f5f5f5"
    },
    content: {
        flex:1,
        padding:16,
        justifyContent : "center",
    },
    title: {
        fontSize:24,
        textAlign: "center",
        marginBottom:24
    },
    button: {
        textAlign: "center",
        marginTop:16,
        marginBottom:16
    },
    error: {
        marginTop: 16
    }
})