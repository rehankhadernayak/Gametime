import { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Spinner from '../../components/Spinner';
import { apiRequest } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { fmtDateTime, getErrorMessage } from '../../utils/format';

const PLATFORM_ICONS = {
  roblox: 'ROB',
  steam: 'STM',
  razer: 'RZR',
  playstation: 'PS',
  xbox: 'XBX',
  default: 'GC',
};

function platformIcon(title) {
  const t = String(title || '').toLowerCase();
  for (const [key, icon] of Object.entries(PLATFORM_ICONS)) {
    if (t.includes(key)) return icon;
  }
  return PLATFORM_ICONS.default;
}

export default function ChildRewardsScreen() {
  const { token, user, refreshMe } = useAuth();
  const insets = useSafeAreaInsets();

  const [rewards, setRewards] = useState([]);
  const [giftcardCodes, setGiftcardCodes] = useState([]);
  const [revealedCode, setRevealedCode] = useState(null);
  const [redeemBusy, setRedeemBusy] = useState(null);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [list, codes] = await Promise.all([
      apiRequest('/rewards/list', { token }),
      apiRequest('/giftcards/my-codes', { token }).catch(() => []),
    ]);
    setRewards(list);
    setGiftcardCodes(codes);
  }, [token]);

  useEffect(() => {
    load()
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setInitialLoading(false));
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    try { await load(); } catch (e) { setError(getErrorMessage(e)); }
    setRefreshing(false);
  }

  function showToast(msg, tone = 'success') {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 4000);
  }

  async function redeem(rewardId, isGiftcard) {
    setRedeemBusy(rewardId);
    setError('');
    setRevealedCode(null);
    try {
      const result = await apiRequest('/rewards/redeem', { method: 'POST', token, body: { rewardId } });
      if (isGiftcard && result?.redemptionId) {
        try {
          const details = await apiRequest(`/giftcards/redemptions/${result.redemptionId}/details`, { token });
          setRevealedCode(details);
          showToast('Gift card code revealed below!');
        } catch {
          showToast('Redeemed! Code will appear in your wallet.');
        }
      } else {
        showToast(result?.fulfilled ? 'Reward delivered!' : 'Redeemed! Parent will fulfill it.');
      }
      await load();
      await refreshMe();
    } catch (e) {
      setError(getErrorMessage(e));
    }
    setRedeemBusy(null);
  }

  const gpRewards = rewards.filter((r) => r.isGiftcard || r.pointsType === 'GP');
  const rpRewards = rewards.filter((r) => !r.isGiftcard && (r.pointsType || 'RP') === 'RP');
  const rp = user?.pointsBalance ?? 0;
  const gp = user?.giftcardPointsBalance ?? 0;

  if (initialLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Spinner full />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Gradient Header ── */}
      <LinearGradient colors={['#7C3AED', '#6D28D9']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Rewards</Text>
        <Text style={styles.headerSub}>Spend your points on rewards and gift cards</Text>

        {/* Balance pills */}
        <View style={styles.balanceRow}>
          <View style={styles.balancePill}>
            <Text style={styles.balanceValue}>{rp}</Text>
            <Text style={styles.balanceLabel}>RP</Text>
          </View>
          <View style={[styles.balancePill, styles.balancePillGold]}>
            <Text style={[styles.balanceValue, styles.balanceValueGold]}>{gp}</Text>
            <Text style={[styles.balanceLabel, styles.balanceLabelGold]}>GP</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.childAccent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Toast ── */}
        {toast ? (
          <View style={[styles.toast, toast.tone === 'error' && styles.toastError]}>
            <Text style={styles.toastText}>{toast.msg}</Text>
          </View>
        ) : null}

        {/* ── Error ── */}
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
            <TouchableOpacity onPress={() => setError('')}><Text style={styles.errorClose}>✕</Text></TouchableOpacity>
          </View>
        ) : null}

        {/* ── Revealed Code ── */}
        {revealedCode ? (
          <View style={styles.revealCard}>
            <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.revealGradient}>
              <Text style={styles.revealTitle}>Your Gift Card</Text>
              <Text style={styles.revealName}>{revealedCode.rewardTitle || revealedCode.giftcardName || 'Gift Card'}</Text>
              {revealedCode.skuName ? <Text style={styles.revealSku}>{revealedCode.skuName}</Text> : null}
            </LinearGradient>
            <View style={styles.revealBody}>
              <Text style={styles.revealCodeLabel}>Code</Text>
              <Text style={styles.revealCode}>{revealedCode.code}</Text>
              {revealedCode.pin ? (
                <View style={styles.revealPinRow}>
                  <Text style={styles.revealCodeLabel}>PIN</Text>
                  <Text style={styles.revealCode}>{revealedCode.pin}</Text>
                </View>
              ) : null}
              {revealedCode.expiryDate ? <Text style={styles.revealExpiry}>Expires {revealedCode.expiryDate}</Text> : null}
              <TouchableOpacity style={styles.revealDismiss} onPress={() => setRevealedCode(null)}>
                <Text style={styles.revealDismissText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* ── GP Gift Card Rewards ── */}
        <Text style={styles.sectionHeader}>Gift Cards <Text style={styles.sectionBadge}>GP</Text></Text>
        {gpRewards.length === 0 ? (
          <View style={styles.emptySection}>
            <Text style={styles.emptyText}>No gift cards yet — ask your parent to add some!</Text>
          </View>
        ) : (
          gpRewards.map((reward) => (
            <RewardCard
              key={reward.id}
              reward={reward}
              currency="GP"
              userBalance={gp}
              onRedeem={() => redeem(reward.id, reward.isGiftcard)}
              busy={redeemBusy === reward.id}
            />
          ))
        )}

        {/* ── RP Regular Rewards ── */}
        <Text style={[styles.sectionHeader, { marginTop: 20 }]}>Rewards <Text style={styles.sectionBadgeRP}>RP</Text></Text>
        {rpRewards.length === 0 ? (
          <View style={styles.emptySection}>
            <Text style={styles.emptyText}>No RP rewards yet — ask your parent to add some!</Text>
          </View>
        ) : (
          rpRewards.map((reward) => (
            <RewardCard
              key={reward.id}
              reward={reward}
              currency="RP"
              userBalance={rp}
              onRedeem={() => redeem(reward.id, false)}
              busy={redeemBusy === reward.id}
            />
          ))
        )}

        {/* ── Gift Card Wallet ── */}
        {giftcardCodes.length > 0 ? (
          <>
            <Text style={[styles.sectionHeader, { marginTop: 20 }]}>My Wallet</Text>
            {giftcardCodes.map((gc) => (
              <View key={gc.id} style={styles.walletCard}>
                <View style={styles.walletTop}>
                  <Text style={styles.walletIcon}>{platformIcon(gc.rewardTitle || gc.giftcardName)}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.walletName}>{gc.rewardTitle || gc.giftcardName || 'Gift Card'}</Text>
                    {gc.skuName ? <Text style={styles.walletSku}>{gc.skuName}</Text> : null}
                  </View>
                </View>
                <View style={styles.walletCodeBox}>
                  <Text style={styles.walletCodeLabel}>Code</Text>
                  <Text style={styles.walletCode}>{gc.code}</Text>
                </View>
                {gc.pin ? (
                  <View style={styles.walletCodeBox}>
                    <Text style={styles.walletCodeLabel}>PIN</Text>
                    <Text style={styles.walletCode}>{gc.pin}</Text>
                  </View>
                ) : null}
                <View style={styles.walletMeta}>
                  {gc.expiryDate ? <Text style={styles.walletMetaText}>Expires {gc.expiryDate}</Text> : null}
                  <Text style={styles.walletMetaText}>Redeemed {fmtDateTime(gc.assignedAt)}</Text>
                </View>
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function RewardCard({ reward, currency, userBalance, onRedeem, busy }) {
  const cost = reward.pointsCost ?? 0;
  const canAfford = userBalance >= cost;
  const available = reward.active && canAfford;
  const icon = platformIcon(reward.title);
  const isGP = currency === 'GP';

  return (
    <View style={[rewardStyles.card, !available && rewardStyles.cardDimmed]}>
      <View style={rewardStyles.top}>
        <View style={[rewardStyles.iconWrap, isGP ? rewardStyles.iconWrapGP : rewardStyles.iconWrapRP]}>
          <Text style={rewardStyles.icon}>{icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={rewardStyles.title}>{reward.title}</Text>
          {reward.description ? <Text style={rewardStyles.desc}>{reward.description}</Text> : null}
          {reward.quantityLimit != null ? (
            <Text style={rewardStyles.qty}>
              {reward.quantityLimit === 0 ? 'Sold out' : `${reward.quantityLimit} remaining`}
            </Text>
          ) : null}
        </View>
        <View style={[rewardStyles.costChip, isGP ? rewardStyles.costChipGP : rewardStyles.costChipRP]}>
          <Text style={[rewardStyles.costValue, isGP ? rewardStyles.costValueGP : rewardStyles.costValueRP]}>{cost}</Text>
          <Text style={[rewardStyles.costLabel, isGP ? rewardStyles.costValueGP : rewardStyles.costValueRP]}>{currency}</Text>
        </View>
      </View>

      {!canAfford ? (
        <View style={rewardStyles.cantAffordRow}>
          <Text style={rewardStyles.cantAffordText}>
            Need {cost - userBalance} more {currency} to unlock
          </Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[rewardStyles.redeemBtn, !available && rewardStyles.redeemBtnDisabled, isGP ? rewardStyles.redeemBtnGP : rewardStyles.redeemBtnRP]}
        onPress={available && !busy ? onRedeem : undefined}
        disabled={!available || busy}
        activeOpacity={0.85}
      >
        <Text style={rewardStyles.redeemBtnText}>
          {busy ? 'Redeeming…' : !reward.active ? 'Unavailable' : !canAfford ? `Need ${cost - userBalance} more ${currency}` : `Redeem for ${cost} ${currency}`}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2, marginBottom: 16 },
  balanceRow: { flexDirection: 'row', gap: 12 },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  balancePillGold: { backgroundColor: 'rgba(245,158,11,0.25)', borderColor: 'rgba(245,158,11,0.5)' },
  balanceValue: { color: '#fff', fontSize: 22, fontWeight: '900' },
  balanceValueGold: { color: '#FCD34D' },
  balanceLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '700' },
  balanceLabelGold: { color: '#FCD34D' },

  content: { padding: 16, gap: 10 },

  toast: { backgroundColor: colors.secondary, borderRadius: 12, padding: 12, marginBottom: 4 },
  toastError: { backgroundColor: colors.danger },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '700', textAlign: 'center' },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.danger + '44',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorBannerText: { flex: 1, color: colors.danger, fontSize: 13 },
  errorClose: { color: colors.danger, fontSize: 16 },

  // Revealed code
  revealCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.xpGold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 4,
  },
  revealGradient: { padding: 16 },
  revealTitle: { color: '#fff', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  revealName: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 2 },
  revealSku: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  revealBody: { backgroundColor: colors.surface, padding: 16, gap: 4 },
  revealCodeLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  revealCode: { color: colors.childAccent, fontSize: 22, fontWeight: '900', letterSpacing: 2, fontFamily: 'monospace' },
  revealPinRow: { marginTop: 8, gap: 4 },
  revealExpiry: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  revealDismiss: {
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  revealDismissText: { color: colors.textSecondary, fontSize: 14, fontWeight: '700' },

  sectionHeader: { color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 6, gap: 6 },
  sectionBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.xpGold,
    backgroundColor: colors.xpGoldSurface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  sectionBadgeRP: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.childAccent,
  },

  emptySection: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 4,
  },
  emptyIcon: { fontSize: 32 },
  emptyText: { color: colors.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: 32 },

  // Wallet
  walletCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  walletTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  walletIcon: { fontSize: 28 },
  walletName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  walletSku: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  walletCodeBox: { gap: 2 },
  walletCodeLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  walletCode: { color: colors.childAccent, fontSize: 18, fontWeight: '900', letterSpacing: 1.5, fontFamily: 'monospace' },
  walletMeta: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  walletMetaText: { color: colors.textMuted, fontSize: 11 },
});

const rewardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardDimmed: { opacity: 0.65 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconWrapGP: { backgroundColor: colors.xpGoldSurface },
  iconWrapRP: { backgroundColor: colors.childAccentLight },
  icon: { fontSize: 26 },
  title: { color: colors.text, fontSize: 15, fontWeight: '700', lineHeight: 20 },
  desc: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  qty: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  costChip: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 52,
    flexShrink: 0,
  },
  costChipGP: { backgroundColor: colors.xpGoldSurface, borderColor: colors.xpGold + '55' },
  costChipRP: { backgroundColor: colors.childAccentLight, borderColor: colors.childAccent + '55' },
  costValue: { fontSize: 16, fontWeight: '900' },
  costValueGP: { color: colors.xpGold },
  costValueRP: { color: colors.childAccent },
  costLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  cantAffordRow: {
    backgroundColor: colors.errorSurface,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cantAffordText: { color: colors.danger, fontSize: 12, fontWeight: '600' },
  redeemBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  redeemBtnRP: { backgroundColor: colors.childAccent },
  redeemBtnGP: { backgroundColor: colors.xpGold },
  redeemBtnDisabled: { backgroundColor: colors.border },
  redeemBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
