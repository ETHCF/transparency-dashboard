import { useState, useEffect } from 'react';
import { formatCurrency, formatDateTime } from '@/utils/format';
import type { TransferRecord } from '@/types/domain';
import styles from './TransferEditModal.module.css';

interface TransferEditModalProps {
  transfer: TransferRecord;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TransferMetadata) => void;
}

interface TransferMetadata {
  payeeName?: string;
  category?: string;
  tags?: string[];
  notes?: string;
  projectId?: string;
}

const CATEGORY_OPTIONS = [
  'Operations',
  'Development',
  'Marketing',
  'Legal',
  'Infrastructure',
  'Grants',
  'Salaries',
  'Services',
  'Other',
];

const COMMON_TAGS = [
  'recurring',
  'one-time',
  'contractor',
  'employee',
  'vendor',
  'reimbursement',
  'grant',
  'milestone',
  'emergency',
  'planned',
];

export const TransferEditModal: React.FC<TransferEditModalProps> = ({
  transfer,
  isOpen,
  onClose,
  onSave,
}) => {
  const [metadata, setMetadata] = useState<TransferMetadata>({
    payeeName: transfer.toName || '',
    category: '',
    tags: [],
    notes: '',
    projectId: '',
  });

  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setMetadata({
        payeeName: transfer.direction === 'outgoing' ? transfer.toName || '' : transfer.fromName || '',
        category: '',
        tags: [],
        notes: '',
        projectId: '',
      });
      setTagInput('');
    }
  }, [isOpen, transfer]);

  if (!isOpen) return null;

  const handleAddTag = (tag: string) => {
    const normalizedTag = tag.trim().toLowerCase();
    if (normalizedTag && !metadata.tags?.includes(normalizedTag)) {
      setMetadata({
        ...metadata,
        tags: [...(metadata.tags || []), normalizedTag],
      });
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setMetadata({
      ...metadata,
      tags: metadata.tags?.filter(tag => tag !== tagToRemove) || [],
    });
  };

  const handleSave = () => {
    onSave(metadata);
    onClose();
  };

  const isOutgoing = transfer.direction === 'outgoing';
  const amount = transfer.amount ? BigInt(transfer.amount) : BigInt(0);
  const decimals = 18; // Default to ETH decimals, should be passed based on asset
  const formattedAmount = Number(amount) / Math.pow(10, decimals);

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
                  href={`https://etherscan.io/tx/${transfer.txHash}`}
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
                <span className={styles.infoLabel}>USD Value</span>
                <span className={styles.infoValue}>
                  {formatCurrency(transfer.usdWorth || 0)}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Date</span>
                <span className={styles.infoValue}>
                  {transfer.blockTimestamp ? formatDateTime(transfer.blockTimestamp) : 'N/A'}
                </span>
              </div>
            </div>

            <div className={styles.addressSection}>
              <div className={styles.addressItem}>
                <span className={styles.addressLabel}>From</span>
                <span className={styles.address}>
                  {transfer.fromAddress?.slice(0, 6)}...{transfer.fromAddress?.slice(-4)}
                </span>
              </div>
              <div className={styles.arrow}>→</div>
              <div className={styles.addressItem}>
                <span className={styles.addressLabel}>To</span>
                <span className={styles.address}>
                  {transfer.toAddress?.slice(0, 6)}...{transfer.toAddress?.slice(-4)}
                </span>
              </div>
            </div>
          </div>

          {/* Editable Fields */}
          <div className={styles.editSection}>
            <div className={styles.field}>
              <label className={styles.label}>
                {isOutgoing ? 'Payee Name' : 'Payer Name'}
              </label>
              <input
                type="text"
                className={styles.input}
                value={metadata.payeeName}
                onChange={(e) => setMetadata({ ...metadata, payeeName: e.target.value })}
                placeholder={isOutgoing ? 'Enter payee name' : 'Enter payer name'}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Category</label>
              <select
                className={styles.select}
                value={metadata.category}
                onChange={(e) => setMetadata({ ...metadata, category: e.target.value })}
              >
                <option value="">Select category</option>
                {CATEGORY_OPTIONS.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Tags</label>
              <div className={styles.tagInput}>
                <input
                  type="text"
                  className={styles.input}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag(tagInput);
                    }
                  }}
                  placeholder="Add a tag and press Enter"
                />
              </div>
              <div className={styles.tagSuggestions}>
                {COMMON_TAGS.filter(tag => !metadata.tags?.includes(tag)).map(tag => (
                  <button
                    key={tag}
                    className={styles.tagSuggestion}
                    onClick={() => handleAddTag(tag)}
                  >
                    + {tag}
                  </button>
                ))}
              </div>
              {metadata.tags && metadata.tags.length > 0 && (
                <div className={styles.tagList}>
                  {metadata.tags.map(tag => (
                    <span key={tag} className={styles.tag}>
                      {tag}
                      <button
                        className={styles.tagRemove}
                        onClick={() => handleRemoveTag(tag)}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Project ID</label>
              <input
                type="text"
                className={styles.input}
                value={metadata.projectId}
                onChange={(e) => setMetadata({ ...metadata, projectId: e.target.value })}
                placeholder="Associated project or grant ID"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Notes</label>
              <textarea
                className={styles.textarea}
                value={metadata.notes}
                onChange={(e) => setMetadata({ ...metadata, notes: e.target.value })}
                placeholder="Additional notes or context"
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.saveBtn} onClick={handleSave}>
            Save Changes
          </button>
        </div>
      </div>
    </>
  );
};