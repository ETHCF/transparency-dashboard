import { useRef } from "react";

import styles from "./FileUploader.module.css";

export interface FileUploaderProps {
  onFileSelected: (file: File) => void;
  accept?: string;
}

export const FileUploader = ({
  onFileSelected,
  accept,
}: FileUploaderProps): JSX.Element => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={styles.uploader}>
      <p>Drag and drop or click to upload</p>
      <button
        type="button"
        className={styles.button}
        onClick={() => inputRef.current?.click()}
      >
        Choose File
      </button>
      <input
        type="file"
        accept={accept}
        ref={inputRef}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onFileSelected(file);
          }
        }}
        hidden
      />
    </div>
  );
};
