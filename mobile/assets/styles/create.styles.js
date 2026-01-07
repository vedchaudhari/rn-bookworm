// styles/create.styles.js
import { StyleSheet } from "react-native";
import COLORS from "../../constants/colors";

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.background,
    padding: 24,
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
    alignItems: "flex-start",
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  form: {
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 24,
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
  textArea: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 16,
    padding: 16,
    height: 120,
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '500',
    textAlignVertical: 'top',
  },
  ratingContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 16,
    padding: 12,
  },
  starButton: {
    padding: 8,
  },
  imagePicker: {
    width: "100%",
    height: 200,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.surfaceLight,
    borderStyle: 'dashed',
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  placeholderContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: COLORS.textMuted,
    marginTop: 8,
    fontWeight: '600',
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    height: 56,
    flexDirection: "row",
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
  buttonIcon: {
    marginRight: 10,
  },
});

export default styles;