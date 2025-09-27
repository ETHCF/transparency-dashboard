import { useState, useEffect } from 'react';
import styles from './MultiSigStatus.module.css';

interface Signer {
  address: string;
  name?: string;
  hasSigned: boolean;
  signedAt?: string;
}

interface MultiSigTransaction {
  txHash?: string;
  safeAddress: string;
  nonce: number;
  threshold: number;
  signers: Signer[];
  status: 'pending' | 'executed' | 'cancelled';
  executedAt?: string;
  value: string;
  to: string;
  data?: string;
}

interface MultiSigStatusProps {
  txHash?: string;
  safeAddress?: string;
}

// Mock data generator for demonstration
const generateMockMultiSigData = (txHash?: string): MultiSigTransaction | null => {
  if (!txHash) return null;

  const randomThreshold = Math.floor(Math.random() * 3) + 2;
  const randomSigners = Math.floor(Math.random() * 3) + randomThreshold;
  const signedCount = Math.floor(Math.random() * (randomThreshold + 1));

  const signers: Signer[] = Array.from({ length: randomSigners }, (_, i) => ({
    address: `0x${Math.random().toString(16).substr(2, 40)}`,
    name: ['Alice.eth', 'Bob.eth', 'Charlie.eth', 'Dave.eth', 'Eve.eth'][i] || `Signer ${i + 1}`,
    hasSigned: i < signedCount,
    signedAt: i < signedCount ? new Date(Date.now() - Math.random() * 86400000).toISOString() : undefined,
  }));

  return {
    txHash,
    safeAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
    nonce: Math.floor(Math.random() * 100),
    threshold: randomThreshold,
    signers,
    status: signedCount >= randomThreshold ? 'executed' : 'pending',
    executedAt: signedCount >= randomThreshold ? new Date().toISOString() : undefined,
    value: (Math.random() * 10).toFixed(4),
    to: `0x${Math.random().toString(16).substr(2, 40)}`,
  };
};

export const MultiSigStatus: React.FC<MultiSigStatusProps> = ({ txHash, safeAddress }) => {
  const [multiSigData, setMultiSigData] = useState<MultiSigTransaction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In production, this would fetch from Safe API or similar
    const fetchMultiSigData = async () => {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        const data = generateMockMultiSigData(txHash);
        setMultiSigData(data);
        setLoading(false);
      }, 500);
    };

    if (txHash || safeAddress) {
      fetchMultiSigData();
    } else {
      setLoading(false);
    }
  }, [txHash, safeAddress]);

  if (loading) {
    return <div className={styles.loading}>Checking multi-sig status...</div>;
  }

  if (!multiSigData) {
    return null;
  }

  const signedCount = multiSigData.signers.filter(s => s.hasSigned).length;
  const progress = (signedCount / multiSigData.threshold) * 100;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Multi-Signature Transaction</h3>
        <span className={`${styles.status} ${styles[multiSigData.status]}`}>
          {multiSigData.status === 'executed' ? '✅ Executed' :
           multiSigData.status === 'cancelled' ? '❌ Cancelled' :
           '⏳ Pending'}
        </span>
      </div>

      <div className={styles.info}>
        <div className={styles.infoItem}>
          <span className={styles.label}>Safe Address</span>
          <span className={styles.value}>
            {multiSigData.safeAddress.slice(0, 6)}...{multiSigData.safeAddress.slice(-4)}
          </span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.label}>Nonce</span>
          <span className={styles.value}>#{multiSigData.nonce}</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.label}>Threshold</span>
          <span className={styles.value}>
            {signedCount} of {multiSigData.threshold} required
          </span>
        </div>
      </div>

      <div className={styles.progressContainer}>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{
              width: `${progress}%`,
              background: progress >= 100 ? '#48CC88' : '#627EEA'
            }}
          />
        </div>
      </div>

      <div className={styles.signers}>
        <h4 className={styles.signersTitle}>Signers</h4>
        <div className={styles.signersList}>
          {multiSigData.signers.map((signer, index) => (
            <div key={index} className={styles.signer}>
              <div className={styles.signerInfo}>
                <span className={`${styles.signerStatus} ${signer.hasSigned ? styles.signed : ''}`}>
                  {signer.hasSigned ? '✅' : '⭕'}
                </span>
                <div className={styles.signerDetails}>
                  <span className={styles.signerName}>
                    {signer.name || `${signer.address.slice(0, 6)}...${signer.address.slice(-4)}`}
                  </span>
                  {signer.signedAt && (
                    <span className={styles.signerTime}>
                      Signed {new Date(signer.signedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {multiSigData.status === 'pending' && signedCount < multiSigData.threshold && (
        <div className={styles.actions}>
          <button className={styles.signBtn}>
            🖊️ Sign Transaction
          </button>
          {signedCount >= multiSigData.threshold && (
            <button className={styles.executeBtn}>
              ⚡ Execute Transaction
            </button>
          )}
        </div>
      )}
    </div>
  );
};