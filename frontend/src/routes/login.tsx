import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAccount, useSignMessage } from "wagmi";

import { ErrorState } from "@/components/common/ErrorState";
import { Loader } from "@/components/common/Loader";
import { WalletButton } from "@/components/common/WalletButton";
import { Page, PageSection } from "@/components/layout/Page";
import { fetchAuthChallenge, submitAuthLogin } from "@/services/auth";
import { useUiStore } from "@/stores/ui";
import { useAuthStore } from "@/stores/auth";

const LoginPage = () => {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const addToast = useUiStore((state) => state.addToast);
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      void navigate({ to: "/admin" });
    }
  }, [isAuthenticated, navigate]);

  const loginMutation = useMutation({
    mutationFn: async () => {
      if (!address) {
        throw new Error("Connect a wallet to continue");
      }

      const challenge = await fetchAuthChallenge(address);
      const signature = await signMessageAsync({ message: challenge.message });

      await submitAuthLogin(challenge.message, signature);
    },
    onSuccess: () => {
      addToast({ title: "Signed in", variant: "success" });
      void navigate({ to: "/admin" });
    },
    onError: (error) => {
      addToast({
        title: "Login failed",
        description:
          error instanceof Error ? error.message : "Unexpected error",
        variant: "error",
      });
    },
  });

  return (
    <Page>
      <PageSection
        title="Administrator Login"
        description="Sign a message with your Ethereum wallet to access admin tools."
      >
        <WalletButton />
        {!isConnected ? (
          <p>Connect an approved admin wallet to continue.</p>
        ) : null}
        <button
          type="button"
          disabled={!isConnected || loginMutation.isPending}
          onClick={() => loginMutation.mutate()}
        >
          {loginMutation.isPending ? "Signing in…" : "Sign message"}
        </button>
      </PageSection>
      {loginMutation.isError ? (
        <ErrorState
          title="Authentication error"
          description={(loginMutation.error as Error).message}
        />
      ) : null}
      {loginMutation.isPending ? (
        <Loader label="Awaiting wallet signature" />
      ) : null}
    </Page>
  );
};

export const Route = createFileRoute("/login")({
  component: LoginPage,
});
