// styles/home.styles.js
import { StyleSheet, Dimensions } from "react-native";
import COLORS from "../../constants/colors";

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 110,
  },
  header: {
    marginBottom: 24,
    marginTop: 20,
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: "800",
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 4,
    fontWeight: '500',
  },
  bookCard: {
    marginBottom: 24,
    borderRadius: 20,
    backgroundColor: COLORS.cardBg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  floatHeader: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  socialGroup: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 6,
    paddingRight: 12,
    borderRadius: 100,
    backdropFilter: 'blur(10px)', // Note: iOS only
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  username: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.white,
  },
  bookImageContainer: {
    width: "100%",
    height: width * 1.25,
    backgroundColor: COLORS.surfaceLight,
  },
  bookImage: {
    width: "100%",
    height: "100%",
  },
  bookDetails: {
    padding: 20,
    backgroundColor: COLORS.cardBg,
  },
  bookTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textPrimary,
    lineHeight: 28,
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: 'center',
  },
  caption: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
    fontWeight: '400',
  },
  date: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  commentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentCount: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  // Re-using tab styles but making them sleeker
  tabContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    padding: 4,
    borderRadius: 16,
    marginBottom: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: COLORS.surfaceHighlight,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.textPrimary,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 60,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 8,
  },
  footerLoader: {
    marginVertical: 40,
  },
});

export default styles;
