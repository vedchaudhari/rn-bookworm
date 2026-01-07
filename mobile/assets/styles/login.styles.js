// styles/login.styles.js
import { StyleSheet, Dimensions } from "react-native";
import COLORS from "../../constants/colors";

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.background,
    padding: 24,
    justifyContent: "center",
  },
  topIllustration: {
    alignItems: "center",
    width: "100%",
    marginBottom: 40,
  },
  illustrationImage: {
    width: width * 0.6,
    height: width * 0.6,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: COLORS.textPrimary,
    letterSpacing: -1,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  formContainer: {
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    marginBottom: 8,
    color: COLORS.textSecondary,
    fontWeight: "700",
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  eyeIcon: {
    padding: 8,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "800",
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 32,
  },
  footerText: {
    color: COLORS.textMuted,
    marginRight: 6,
    fontWeight: '600',
  },
  link: {
    color: COLORS.primary,
    fontWeight: "800",
  },
});

export default styles;
