import { useState, useEffect } from 'react';
import { formatDateTime } from '@/utils/format';
import type { TransferRecord, Expense } from '@/types/domain';
import type { ExpensePayload } from '@/types/api';
import styles from './TransferEditModal.module.css';

export interface TransferEditModalProps {
  transfer: TransferRecord;
  expense: Expense | null | undefined;
  isLoadingExpense: boolean;
  isSaving: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ExpensePayload) => void;
  categories: string[];
}

const formatDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const TransferEditModal: React.FC<TransferEditModalProps> = ({
  transfer,
  expense,
  isLoadingExpense,
  isSaving,
  isOpen,
  onClose,
  onSave,
  categories,
}) => {
  const [item, setItem] = useState('');
  const [category, setCategory] = useState('');
  const [purpose, setPurpose] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [date, setDate] = useState('');

  // Compute formatted amount from transfer for pre-fill
  const decimals = 18;
  const divisor = 10 ** decimals;
  const formattedAmount = divisor ? transfer.amount / divisor : transfer.amount;

  useEffect(() => {
    if (!isOpen) return;

    if (expense) {
      // Pre-populate from existing expense
      setItem(expense.item ?? '');
      setCategory(expense.category ?? '');
      setPurpose(expense.purpose ?? '');
      setPrice(String(expense.price ?? ''));
      setQuantity(expense.quantity ?? 1);
      setDate(expense.date ? formatDate(expense.date) : '');
    } else {
      // Defaults for new expense
      setItem('');
      setCategory('');
      setPurpose('');
      setPrice(formattedAmount ? String(formattedAmount) : '');
      setQuantity(1);
      setDate(transfer.timestamp ? formatDate(transfer.timestamp) : '');
    }
  }, [isOpen, expense, formattedAmount, transfer.timestamp]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      item: item.trim(),
      category,
      purpose,
      price,
      quantity,
      date: date ? `${date}T00:00:00Z` : date,
    });
  };

  const canSave = item.trim().length > 0 && price.length > 0 && date.length > 0;

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Edit Transfer Details</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.content}>
          {/* Transfer Info */}
          <div className={styles.infoSection}>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Transaction</span>
                <a
                  href={transfer.etherscanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.txLink}
                >
                  {transfer.txHash?.slice(0, 10)}...{transfer.txHash?.slice(-8)}
                </a>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Amount</span>
                <span className={styles.infoValue}>
                  {formattedAmount.toFixed(4)} {transfer.assetSymbol}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Date</span>
                <span className={styles.infoValue}>
                  {transfer.timestamp ? formatDateTime(transfer.timestamp) : 'N/A'}
                </span>
              </div>
            </div>

            <div className={styles.addressSection}>
              <div className={styles.addressItem}>
                <span className={styles.addressLabel}>From</span>
                <span className={styles.address}>
                  {transfer.payerAddress?.slice(0, 6)}...{transfer.payerAddress?.slice(-4)}
                </span>
              </div>
              <div className={styles.arrow}>→</div>
              <div className={styles.addressItem}>
                <span className={styles.addressLabel}>To</span>
                <span className={styles.address}>
                  {transfer.payeeAddress?.slice(0, 6)}...{transfer.payeeAddress?.slice(-4)}
                </span>
              </div>
            </div>
          </div>

          {/* Editable Fields */}
          {isLoadingExpense ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#697386' }}>
              Loading expense data...
            </div>
          ) : (
            <div className={styles.editSection}>
              <div className={styles.field}>
                <label className={styles.label}>Item</label>
                <input
                  type="text"
                  className={styles.input}
                  value={item}
                  onChange={(e) => setItem(e.target.value)}
                  placeholder="Item description"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Category</label>
                <select
                  className={styles.select}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Purpose</label>
                <textarea
                  className={styles.textarea}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Purpose of this expense"
                  rows={3}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className={styles.field}>
                  <label className={styles.label}>Price</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Quantity</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                    min={1}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Date</label>
                <input
                  type="date"
                  className={styles.input}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={!canSave || isSaving || isLoadingExpense}
          >
            {isSaving ? 'Saving...' : expense ? 'Update Expense' : 'Create Expense'}
          </button>
        </div>
      </div>
    </>
  );
};
