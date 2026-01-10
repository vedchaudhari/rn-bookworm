import { Stack } from 'expo-router'
import COLORS from '../../constants/colors'

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
        contentStyle: { backgroundColor: COLORS.background }
      }}
    />
  )
}