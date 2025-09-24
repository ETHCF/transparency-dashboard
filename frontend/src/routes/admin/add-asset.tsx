import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormField } from "@/components/forms/FormField";
import { Input } from "@/components/forms/Input";
import { Page, PageSection } from "@/components/layout/Page";
import {
  useAddTreasuryAssetMutation,
} from "@/services/treasury";
import { useUiStore } from "@/stores/ui";

const schema = z.object({
  chainId: z.coerce
    .number({ invalid_type_error: "Chain ID is required" })
    .int()
    .positive("Chain ID must be positive"),
  address: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/u, "Invalid Ethereum address"),
  name: z.string().min(2, "Name is required"),
  symbol: z.string().min(1, "Symbol is required"),
  decimals: z.coerce
    .number({ invalid_type_error: "Decimals are required" })
    .int("Decimals must be an integer")
    .min(0, "Decimals must be at least 0")
    .max(36, "Decimals must be 36 or less"),
});

type FormValues = z.infer<typeof schema>;

const AddAssetPage = (): JSX.Element => {
  const addAssetMutation = useAddTreasuryAssetMutation();
  const addToast = useUiStore((state) => state.addToast);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      chainId: 1,
      decimals: 18,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await addAssetMutation.mutateAsync(values);
      addToast({ title: "Asset added", variant: "success" });
      form.reset({ ...values, address: "", name: "", symbol: "" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to add asset";
      addToast({ title: "Failed to add asset", description: message, variant: "error" });
    }
  });

  return (
    <Page>
      <PageSection
        title="Add Treasury Asset"
        description="Register an ERC-20 token so balances can be tracked"
      >
        <form onSubmit={onSubmit}>
          <FormField
            label="Chain ID"
            error={form.formState.errors.chainId?.message}
            hint="Use 1 for Ethereum mainnet"
          >
            <Input
              type="number"
              step="1"
              min="1"
              {...form.register("chainId")}
              error={Boolean(form.formState.errors.chainId)}
            />
          </FormField>

          <FormField
            label="Token Address"
            error={form.formState.errors.address?.message}
            hint="Contract address of the token"
          >
            <Input
              placeholder="0x..."
              {...form.register("address")}
              error={Boolean(form.formState.errors.address)}
            />
          </FormField>

          <FormField
            label="Name"
            error={form.formState.errors.name?.message}
          >
            <Input
              placeholder="Token name"
              {...form.register("name")}
              error={Boolean(form.formState.errors.name)}
            />
          </FormField>

          <FormField
            label="Symbol"
            error={form.formState.errors.symbol?.message}
          >
            <Input
              placeholder="e.g. USDC"
              {...form.register("symbol")}
              error={Boolean(form.formState.errors.symbol)}
            />
          </FormField>

          <FormField
            label="Decimals"
            error={form.formState.errors.decimals?.message}
            hint="Most ERC-20 tokens use 18"
          >
            <Input
              type="number"
              step="1"
              min="0"
              max="36"
              {...form.register("decimals")}
              error={Boolean(form.formState.errors.decimals)}
            />
          </FormField>

          <button
            type="submit"
            className="btn btnPrimary"
            disabled={addAssetMutation.isPending}
          >
            {addAssetMutation.isPending ? "Saving…" : "Add Asset"}
          </button>
        </form>
      </PageSection>
    </Page>
  );
};

export const Route = createFileRoute("/admin/add-asset")({
  component: AddAssetPage,
});
