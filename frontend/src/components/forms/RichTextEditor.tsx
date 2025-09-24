import type { ComponentPropsWithoutRef } from "react";

import { TextArea } from "@/components/forms/TextArea";

export type RichTextEditorProps = ComponentPropsWithoutRef<"textarea"> & {
  error?: boolean;
};

export const RichTextEditor = ({
  error,
  ...props
}: RichTextEditorProps): JSX.Element => <TextArea {...props} error={error} />;
