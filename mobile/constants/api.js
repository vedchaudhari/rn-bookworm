// import Constants from "expo-constants";
// import { Platform } from 'react-native';

// const getApiUrl = () => {
//     // 1. If running in Expo Go, try to get the host URI (machine's IP)
//     const debuggerHost = Constants.expoConfig?.hostUri;
//     const localhost = debuggerHost?.split(":")[0];

//     if (localhost) {
//         return `http://${localhost}:3000`;
//     }

//     // 2. Fallbacks for Emulators/Simulators if debuggerHost isn't available
//     if (Platform.OS === 'android') {
//         console.log("Emulator is android");
//         return 'http://10.0.2.2:3000'; // Android Emulator
//     }

//     if (Platform.OS === 'ios') {
//         return 'http://localhost:3000'; // iOS Simulator
//     }

//     // 3. Fallback for physical device release builds usually requires a real IP or hardcoded prod URL
//     return 'http://localhost:3000';
// }

// export const API_URL = getApiUrl();

// console.log("API_URL configured as:", API_URL);


export const API_URL = `https://api-bookworm.backend-portfolio-api.online`;
