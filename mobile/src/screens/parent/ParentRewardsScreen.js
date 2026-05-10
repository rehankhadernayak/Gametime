import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import InputField from '../../components/InputField';
import Spinner from '../../components/Spinner';
import { apiRequest } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { fmtDateTime, getErrorMessage, sanitizeText } from '../../utils/format';

const SECTIONS = ['Rewards', 'Gift Cards', 'GP Wallet', 'RP Adjust'];

const initialForm = { title: '', pointsCost: '25', pointsType: 'RP', quantityLimit: '' };
const initialGiftcardForm = {
  rewardTitle: '', giftcardName: '', skuName: '', pointsCost: '25',
  quantityLimit: '', currency: 'SGD', purchaseReference: '', codesInput: ''
};
const initialGpForm = { gpPoints: '100', moneyAmount: '', currency: 'SGD', note: '' };

function parseManualGiftcardCodes(input) {
  return String(input || '').split('\n').map((l) => l.trim()).filter(Boolean).map((line, idx) => {
    const parts = line.split(',').map((s) => sanitizeText(s));
    if (!parts[0]) throw new Error(`Code missing on line ${idx + 1}.`);
    return { code: parts[0], pin: parts[1] || undefined, expiryDate: parts[2] || undefined };
  });
}

function SectionToggle({ title, open, onPress, badge }) {
  return (
    <TouchableOpacity style={toggleStyles.row} onPress={onPress} activeOpacity={0.8}>
      <Text style={toggleStyles.title}>{title}</Text>
      {badge != null ? (
        <View style={toggleStyles.badge}><Text style={toggleStyles.badgeText}>{badge}</Text></View>
      ) : null}
      <Text style={[toggleStyles.caret, open && toggleStyles.caretOpen]}>›</Text>
    </TouchableOpacity>
  );
}

const toggleStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  title: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '700' },
  badge: {
    backgroundColor: colors.primarySurface,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  caret: { color: colors.textMuted, fontSize: 20, fontWeight: '300', transform: [{ rotate: '0deg' }] },
  caretOpen: { transform: [{ rotate: '90deg' }] },
});

export default function ParentRewardsScreen() {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();

  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [rewards, setRewards] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [gpSummary, setGpSummary] = useState({ parentGpBalance: 0, children: [] });

  const [activeSection, setActiveSection] = useState(null);
  const [rewardForm, setRewardForm] = useState(initialForm);
  const [giftcardForm, setGiftcardForm] = useState(initialGiftcardForm);
  const [gpForm, setGpForm] = useState(initialGpForm);
  const [adjust, setAdjust] = useState({ points: '10', note: 'Manual adjustment' });

  const [deleteBusy, setDeleteBusy] = useState(null);
  const [formBusy, setFormBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [childList, rewardList, gpSummaryRes] = await Promise.all([
      apiRequest('/children/list', { token }),
      apiRequest('/rewards/list', { token }),
      apiRequest('/giftcards/gp/summary', { token }),
    ]);
    setChildren(childList);
    setRewards(rewardList);
    setGpSummary(gpSummaryRes);

    const targetId = selectedChildId || childList[0]?.id || '';
    if (targetId !== selectedChildId) setSelectedChildId(targetId);
    if (targetId) {
      const txList = await apiRequest(`/points/transactions?childId=${targetId}`, { token });
      setTransactions(txList);
    } else {
      setTransactions([]);
    }
  }, [token, selectedChildId]);

  useEffect(() => {
    load().catch((e) => setError(getErrorMessage(e))).finally(() => setInitialLoading(false));
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    try { await load(); } catch (e) { setError(getErrorMessage(e)); }
    setRefreshing(false);
  }

  function showToast(msg, tone = 'success') {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleCreateReward() {
    setFormBusy(true);
    setError('');
    try {
      const title = sanitizeText(rewardForm.title);
      const pointsCost = Number(rewardForm.pointsCost);
      const quantityLimit = rewardForm.quantityLimit ? Number(rewardForm.quantityLimit) : null;
      if (!title) throw new Error('Reward title is required.');
      if (!Number.isInteger(pointsCost) || pointsCost < 5 || pointsCost > 1000)
        throw new Error('Cost must be 5–1000.');
      if (quantityLimit !== null && (!Number.isInteger(quantityLimit) || quantityLimit < 1 || quantityLimit > 1000))
        throw new Error('Quantity must be 1–1000.');
      await apiRequest('/rewards/create', { method: 'POST', token, body: { title, pointsCost, pointsType: rewardForm.pointsType, quantityLimit, active: true } });
      setRewardForm(initialForm);
      await load();
      showToast('Reward created.');
    } catch (e) { setError(getErrorMessage(e)); }
    setFormBusy(false);
  }

  async function handleDeleteReward(rewardId) {
    setDeleteBusy(rewardId);
    setError('');
    try {
      await apiRequest(`/rewards/${rewardId}`, { method: 'DELETE', token });
      await load();
      showToast('Reward deleted.');
    } catch (e) { setError(getErrorMessage(e)); }
    setDeleteBusy(null);
  }

  async function handleCreateGiftcard() {
    setFormBusy(true);
    setError('');
    try {
      const rewardTitle = sanitizeText(giftcardForm.rewardTitle);
      const giftcardName = sanitizeText(giftcardForm.giftcardName);
      const skuName = sanitizeText(giftcardForm.skuName);
      const currency = sanitizeText(giftcardForm.currency || 'SGD').toUpperCase();
      const purchaseReference = sanitizeText(giftcardForm.purchaseReference);
      const pointsCost = Number(giftcardForm.pointsCost);
      const requestedLimit = giftcardForm.quantityLimit ? Number(giftcardForm.quantityLimit) : null;
      const codes = parseManualGiftcardCodes(giftcardForm.codesInput);

      if (!rewardTitle || !giftcardName || !skuName) throw new Error('Title, giftcard name, and denomination required.');
      if (!Number.isInteger(pointsCost) || pointsCost < 5 || pointsCost > 1000) throw new Error('GP cost must be 5–1000.');
      if (requestedLimit !== null && (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > codes.length))
        throw new Error(`Quantity limit must be 1–${codes.length}.`);

      const batch = await apiRequest('/giftcards/inventory/manual', {
        method: 'POST', token,
        body: { store: giftcardName, purchaseReference: purchaseReference || undefined, giftcardName, skuName, currency, codes }
      });
      await apiRequest('/giftcards/inventory/create-reward', {
        method: 'POST', token,
        body: { batchId: batch.id, title: rewardTitle, pointsCost, quantityLimit: requestedLimit ?? codes.length, active: true }
      });
      setGiftcardForm(initialGiftcardForm);
      await load();
      showToast('Gift card reward published.');
    } catch (e) { setError(getErrorMessage(e)); }
    setFormBusy(false);
  }

  async function handlePurchaseGp() {
    setFormBusy(true);
    setError('');
    try {
      const gpPoints = Number(gpForm.gpPoints);
      if (!Number.isInteger(gpPoints) || gpPoints < 1 || gpPoints > 100000) throw new Error('GP must be 1–100000.');
      await apiRequest('/giftcards/gp/purchase', {
        method: 'POST', token,
        body: { gpPoints, moneyAmount: gpForm.moneyAmount.trim() || undefined, currency: gpForm.currency.trim().toUpperCase() || 'SGD', note: sanitizeText(gpForm.note) || undefined }
      });
      setGpForm(initialGpForm);
      await load();
      showToast('GP added to parent wallet.');
    } catch (e) { setError(getErrorMessage(e)); }
    setFormBusy(false);
  }

  async function handleAdjust() {
    setFormBusy(true);
    setError('');
    try {
      if (!selectedChildId) throw new Error('Select a child first.');
      const points = Number(adjust.points);
      const note = sanitizeText(adjust.note);
      if (!Number.isInteger(points) || points < -1000 || points > 1000 || points === 0)
        throw new Error('Points must be -1000 to 1000 (not 0).');
      if (!note) throw new Error('Adjustment note is required.');
      await apiRequest('/points/adjust', { method: 'POST', token, body: { childId: selectedChildId, points, note } });
      await load();
      showToast('Points adjusted.');
    } catch (e) { setError(getErrorMessage(e)); }
    setFormBusy(false);
  }

  async function onSelectChild(id) {
    setSelectedChildId(id);
    try {
      const txList = await apiRequest(`/points/transactions?childId=${id}`, { token });
      setTransactions(txList);
    } catch { /* silent */ }
  }

  if (initialLoading) return <View style={{ flex: 1, backgroundColor: colors.background }}><Spinner full /></View>;

  const selectedChild = children.find((c) => c.id === selectedChildId);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Rewards & Points</Text>
        <Text style={styles.headerSub}>Manage rewards, GP wallet, and point adjustments</Text>
        <View style={styles.gpRow}>
          <View style={styles.gpPill}>
            <Text style={styles.gpValue}>{Number(gpSummary.parentGpBalance || 0)}</Text>
            <Text style={styles.gpLabel}>Parent GP</Text>
          </View>
          <View style={styles.gpPill}>
            <Text style={styles.gpValue}>{rewards.length}</Text>
            <Text style={styles.gpLabel}>Rewards</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Toast / Error */}
        {toast ? <View style={[styles.toast, toast.tone === 'error' && styles.toastError]}><Text style={styles.toastText}>{toast.msg}</Text></View> : null}
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => setError('')}><Text style={styles.errorClose}>✕</Text></TouchableOpacity>
          </View>
        ) : null}

        {/* ── Rewards Section ── */}
        <SectionToggle title="Rewards" badge={rewards.length} open={activeSection === 'Rewards'} onPress={() => setActiveSection(activeSection === 'Rewards' ? null : 'Rewards')} />
        {activeSection === 'Rewards' ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Create Reward</Text>

            <InputField label="Title" value={rewardForm.title} onChangeText={(v) => setRewardForm((p) => ({ ...p, title: v }))} maxLength={50} placeholder="e.g. Extra screen time" />
            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <InputField label={`Cost (${rewardForm.pointsType})`} value={rewardForm.pointsCost} onChangeText={(v) => setRewardForm((p) => ({ ...p, pointsCost: v }))} keyboardType="number-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <InputField label="Qty limit" value={rewardForm.quantityLimit} onChangeText={(v) => setRewardForm((p) => ({ ...p, quantityLimit: v }))} keyboardType="number-pad" placeholder="Unlimited" />
              </View>
            </View>

            <Text style={styles.typeLabel}>Balance type</Text>
            <View style={styles.typeRow}>
              {['RP', 'GP'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, rewardForm.pointsType === t && styles.typeChipActive]}
                  onPress={() => setRewardForm((p) => ({ ...p, pointsType: t }))}
                >
                  <Text style={[styles.typeChipText, rewardForm.pointsType === t && styles.typeChipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={[styles.actionBtn, (!rewardForm.title || formBusy) && styles.actionBtnDisabled]} onPress={handleCreateReward} disabled={!rewardForm.title || formBusy} activeOpacity={0.85}>
              <Text style={styles.actionBtnText}>{formBusy ? 'Creating…' : 'Create Reward'}</Text>
            </TouchableOpacity>

            {rewards.length > 0 ? (
              <>
                <View style={styles.divider} />
                <Text style={styles.panelSubTitle}>Existing Rewards</Text>
                {rewards.map((reward) => (
                  <View key={reward.id} style={styles.rewardRow}>
                    <View style={styles.rewardIconWrap}>
                      <Text style={styles.rewardIcon}>{reward.isGiftcard ? 'GC' : 'RP'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rewardTitle}>{reward.title}</Text>
                      <Text style={styles.rewardMeta}>
                        {reward.pointsCost} {reward.pointsType || 'RP'} · {reward.quantityLimit ?? 'Unlimited'} qty · {reward.active ? 'Active' : 'Inactive'}
                        {reward.giftcard ? ` · ${reward.giftcard.availableCodes} in stock` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteReward(reward.id)}
                      disabled={deleteBusy === reward.id}
                    >
                      <Text style={styles.deleteBtnText}>{deleteBusy === reward.id ? '…' : 'Del'}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            ) : (
              <View style={styles.emptySection}>
                <Text style={styles.emptyText}>No rewards yet. Create your first above.</Text>
              </View>
            )}
          </View>
        ) : null}

        {/* ── Gift Cards Section ── */}
        <SectionToggle title="Gift Card Inventory" open={activeSection === 'GiftCards'} onPress={() => setActiveSection(activeSection === 'GiftCards' ? null : 'GiftCards')} />
        {activeSection === 'GiftCards' ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Add Gift Card Reward</Text>
            <Text style={styles.panelHint}>One code per line: <Text style={styles.panelCode}>CODE</Text> or <Text style={styles.panelCode}>CODE,PIN</Text> or <Text style={styles.panelCode}>CODE,PIN,YYYY-MM-DD</Text></Text>

            <InputField label="Reward title (shown to child)" value={giftcardForm.rewardTitle} onChangeText={(v) => setGiftcardForm((p) => ({ ...p, rewardTitle: v }))} maxLength={50} />
            <InputField label="Gift card name (e.g. Roblox)" value={giftcardForm.giftcardName} onChangeText={(v) => setGiftcardForm((p) => ({ ...p, giftcardName: v }))} maxLength={120} />
            <InputField label="Denomination / SKU (e.g. SGD 10)" value={giftcardForm.skuName} onChangeText={(v) => setGiftcardForm((p) => ({ ...p, skuName: v }))} maxLength={120} />

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <InputField label="GP cost" value={giftcardForm.pointsCost} onChangeText={(v) => setGiftcardForm((p) => ({ ...p, pointsCost: v }))} keyboardType="number-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <InputField label="Currency" value={giftcardForm.currency} onChangeText={(v) => setGiftcardForm((p) => ({ ...p, currency: v.toUpperCase() }))} maxLength={10} />
              </View>
            </View>

            <InputField label="Quantity limit (optional)" value={giftcardForm.quantityLimit} onChangeText={(v) => setGiftcardForm((p) => ({ ...p, quantityLimit: v }))} keyboardType="number-pad" placeholder="Defaults to code count" />
            <InputField label="Purchase reference (optional)" value={giftcardForm.purchaseReference} onChangeText={(v) => setGiftcardForm((p) => ({ ...p, purchaseReference: v }))} maxLength={120} />

            <Text style={styles.typeLabel}>Codes</Text>
            <TextInput
              style={styles.codesInput}
              value={giftcardForm.codesInput}
              onChangeText={(v) => setGiftcardForm((p) => ({ ...p, codesInput: v }))}
              placeholder="Paste codes here, one per line…"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={6}
            />

            <TouchableOpacity style={[styles.actionBtnGold, (!giftcardForm.codesInput.trim() || formBusy) && styles.actionBtnDisabled]} onPress={handleCreateGiftcard} disabled={!giftcardForm.codesInput.trim() || formBusy} activeOpacity={0.85}>
              <Text style={styles.actionBtnText}>{formBusy ? 'Publishing…' : 'Publish Gift Card Reward'}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ── GP Wallet Section ── */}
        <SectionToggle title={`GP Wallet · ${Number(gpSummary.parentGpBalance || 0)} GP`} open={activeSection === 'GPWallet'} onPress={() => setActiveSection(activeSection === 'GPWallet' ? null : 'GPWallet')} />
        {activeSection === 'GPWallet' ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Add GP to Parent Wallet</Text>

            {/* Children GP balances */}
            {gpSummary.children?.length > 0 ? (
              <View style={styles.childGpRow}>
                {gpSummary.children.map((c) => (
                  <View key={c.id} style={styles.childGpChip}>
                    <Text style={styles.childGpName}>{c.name}</Text>
                    <Text style={styles.childGpValue}>{c.giftcardPointsBalance ?? 0} GP</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <InputField label="GP to add" value={gpForm.gpPoints} onChangeText={(v) => setGpForm((p) => ({ ...p, gpPoints: v }))} keyboardType="number-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <InputField label="Currency" value={gpForm.currency} onChangeText={(v) => setGpForm((p) => ({ ...p, currency: v.toUpperCase() }))} maxLength={10} />
              </View>
            </View>
            <InputField label="Amount paid (optional)" value={gpForm.moneyAmount} onChangeText={(v) => setGpForm((p) => ({ ...p, moneyAmount: v }))} />
            <InputField label="Note (optional)" value={gpForm.note} onChangeText={(v) => setGpForm((p) => ({ ...p, note: v }))} maxLength={200} />

            <TouchableOpacity style={[styles.actionBtn, formBusy && styles.actionBtnDisabled]} onPress={handlePurchaseGp} disabled={formBusy} activeOpacity={0.85}>
              <Text style={styles.actionBtnText}>{formBusy ? 'Adding…' : 'Add GP to Wallet'}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ── RP Adjustment Section ── */}
        <SectionToggle title="RP Adjustment" open={activeSection === 'RPAdjust'} onPress={() => setActiveSection(activeSection === 'RPAdjust' ? null : 'RPAdjust')} />
        {activeSection === 'RPAdjust' ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Manually Adjust Points</Text>

            {/* Child selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.childSelectorRow}>
              {children.map((child) => (
                <TouchableOpacity
                  key={child.id}
                  style={[styles.childChip, selectedChildId === child.id && styles.childChipActive]}
                  onPress={() => onSelectChild(child.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.childAvatar, selectedChildId === child.id && styles.childAvatarActive]}>
                    <Text style={styles.childAvatarText}>{child.name?.[0]?.toUpperCase() || '?'}</Text>
                  </View>
                  <View>
                    <Text style={[styles.childChipName, selectedChildId === child.id && styles.childChipNameActive]}>{child.name}</Text>
                    <Text style={styles.childChipBalance}>RP {child.pointsBalance}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <InputField label="RP delta (+/-)" value={adjust.points} onChangeText={(v) => setAdjust((p) => ({ ...p, points: v }))} keyboardType="number-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <InputField label="Note" value={adjust.note} onChangeText={(v) => setAdjust((p) => ({ ...p, note: v }))} maxLength={100} />
              </View>
            </View>

            <TouchableOpacity style={[styles.actionBtn, (!selectedChildId || !adjust.points || formBusy) && styles.actionBtnDisabled]} onPress={handleAdjust} disabled={!selectedChildId || !adjust.points || formBusy} activeOpacity={0.85}>
              <Text style={styles.actionBtnText}>{formBusy ? 'Applying…' : 'Apply Adjustment'}</Text>
            </TouchableOpacity>

            {/* Recent transactions */}
            {transactions.length > 0 ? (
              <>
                <View style={styles.divider} />
                <Text style={styles.panelSubTitle}>Recent Transactions — {selectedChild?.name}</Text>
                {transactions.slice(0, 20).map((tx) => (
                  <View key={tx.id} style={styles.txRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txKind}>{tx.pointsKind || 'RP'} {tx.type}</Text>
                      <Text style={styles.txRef}>{tx.referenceType}{tx.referenceId ? ` #${tx.referenceId}` : ''}</Text>
                      <Text style={styles.txDate}>{fmtDateTime(tx.createdAt)}</Text>
                    </View>
                    <Text style={[styles.txPoints, tx.points > 0 ? styles.txCredit : styles.txDebit]}>
                      {tx.points > 0 ? '+' : ''}{tx.points}
                    </Text>
                  </View>
                ))}
              </>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Header
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: colors.bgRoot,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  headerTitle: { color: '#000000', fontSize: 22, fontWeight: '800' },
  headerSub: { color: '#525252', fontSize: 13, marginTop: 2, marginBottom: 14 },
  gpRow: { flexDirection: 'row', gap: 12 },
  gpPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: '#000000',
  },
  gpValue: { color: '#000000', fontSize: 20, fontWeight: '900' },
  gpLabel: { color: '#525252', fontSize: 12, fontWeight: '600' },

  content: { padding: 16, gap: 10 },

  toast: { backgroundColor: colors.secondary, borderRadius: 12, padding: 12 },
  toastError: { backgroundColor: colors.danger },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '700', textAlign: 'center' },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.errorSurface, borderRadius: 12, borderWidth: 1, borderColor: colors.danger + '44',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  errorText: { flex: 1, color: colors.danger, fontSize: 13 },
  errorClose: { color: colors.danger, fontSize: 16 },

  // Panel
  panel: {
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, padding: 16, gap: 8,
    marginTop: -8,
  },
  panelTitle: { color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  panelSubTitle: { color: colors.text, fontSize: 14, fontWeight: '700', marginTop: 4 },
  panelHint: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  panelCode: { fontFamily: 'monospace', color: colors.primary },

  twoCol: { flexDirection: 'row', gap: 10 },

  typeLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginTop: 4 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeChip: {
    flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface2,
  },
  typeChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  typeChipText: { fontSize: 14, fontWeight: '700', color: colors.textMuted },
  typeChipTextActive: { color: colors.primary },

  codesInput: {
    borderWidth: 1.5, borderColor: colors.borderStrong, borderRadius: 10,
    padding: 12, fontSize: 13, color: colors.text, minHeight: 120, textAlignVertical: 'top',
    fontFamily: 'monospace',
  },

  actionBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  actionBtnGold: { backgroundColor: colors.xpGold, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  actionBtnDisabled: { opacity: 0.45 },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: 6 },

  // Rewards list
  rewardRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border,
  },
  rewardIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primarySurface, alignItems: 'center', justifyContent: 'center' },
  rewardIcon: { fontSize: 18 },
  rewardTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  rewardMeta: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  deleteBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { fontSize: 18 },

  emptySection: { paddingVertical: 16, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 13 },

  // Child GP chips
  childGpRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  childGpChip: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  childGpName: { color: colors.textMuted, fontSize: 10, fontWeight: '600' },
  childGpValue: { color: colors.xpGold, fontSize: 13, fontWeight: '800' },

  // Child selector for RP
  childSelectorRow: { gap: 10, paddingVertical: 4 },
  childChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface2,
  },
  childChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  childAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  childAvatarActive: { backgroundColor: colors.primary },
  childAvatarText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  childChipName: { color: colors.text, fontSize: 13, fontWeight: '700' },
  childChipNameActive: { color: colors.primary },
  childChipBalance: { color: colors.textMuted, fontSize: 11 },

  // Transactions
  txRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border,
  },
  txKind: { color: colors.text, fontSize: 13, fontWeight: '600' },
  txRef: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  txDate: { color: colors.textMuted, fontSize: 10 },
  txPoints: { fontSize: 16, fontWeight: '800' },
  txCredit: { color: colors.secondary },
  txDebit: { color: colors.danger },
});
