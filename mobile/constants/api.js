import Constants from "expo-constants";

const localhost = Constants.expoConfig?.hostUri?.split(":")[0];

// export const API_URL = `http://${localhost}:3000`;

export const API_URL = `https://20a2d031b9e7.ngrok-free.app`;


// import * as Device from "expo-device";

// export const API_URL =
//   Platform.OS === "android"
//     ? Device.isDevice
//         ? "http://192.168.29.xxx:3000"   // real Android
//         : "http://10.0.2.2:3000"         // emulator
//     : Device.isDevice
//         ? "http://192.168.29.xxx:3000"   // real iPhone
//         : "http://localhost:3000";       // iOS simulator
